using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using SignLibraryAspNet.Services;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.StaticFiles;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseWebRoot("wwwroot");
builder.Services.AddSingleton<LibraryStore>();
var app = builder.Build();
var store = app.Services.GetRequiredService<LibraryStore>();
var root = app.Environment.ContentRootPath;
var webroot = Path.Combine(root,"wwwroot");
var files = new FileExtensionContentTypeProvider();
files.Mappings[".obj"] = "text/plain";
files.Mappings[".mtl"] = "text/plain";

app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["Cache-Control"] = "no-store";
    ctx.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'";
    try
    {
        // Original Python service only allowed local access by default.
        if (!(ctx.Connection.RemoteIpAddress is null || IPAddress.IsLoopback(ctx.Connection.RemoteIpAddress)) &&
             !app.Configuration.GetValue("SignLibrary:AllowRemoteAccess",false))
            throw new ApiException(403,"로컬 컴퓨터에서 접속하세요. LAN 접근은 별도로 설정해야 합니다.");
        if (HttpMethods.IsPost(ctx.Request.Method))
        {
            var origin=ctx.Request.Headers["Origin"].ToString().TrimEnd('/');
            var authority=$"{ctx.Request.Scheme}://{ctx.Request.Host}";
            if (origin!=authority || ctx.Request.Headers["X-Library-Token"].ToString()!=store.Token)
            {
                if (ctx.Request.Headers["X-Library-Token"].ToString()!=store.Token)
                    ctx.Response.Headers["X-Library-Session"] = "expired";
                throw new ApiException(403,"서버 연결이 갱신되었습니다. 화면을 다시 불러오세요.");
            }
        }
        await next();
    }
    catch (ApiException ex)
    {
        ctx.Response.StatusCode=ex.Status;
        await ctx.Response.WriteAsJsonAsync(new {detail=ex.Message});
    }
    catch (JsonException)
    {
        ctx.Response.StatusCode=422;
        await ctx.Response.WriteAsJsonAsync(new {detail="JSON 입력을 확인하세요."});
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex,"표지판 API 처리 실패");
        ctx.Response.StatusCode=503;
        await ctx.Response.WriteAsJsonAsync(new {detail="자료 처리 중 오류가 발생했습니다. 서버 로그를 확인하세요."});
    }
});
app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(webroot,"static")),
    RequestPath = "/static",
    ContentTypeProvider=files
});

app.MapGet("/",() => Results.File(Path.Combine(webroot,"index.html"),"text/html; charset=utf-8"));
app.MapGet("/api/health",() => Results.Json(new { application="sign-library",protocol=1,lanAddress=(string?)null,backend="ASP.NET Core 8" }));
app.MapGet("/api/session",() => Results.Json(new {csrfToken=store.Token}));
app.MapGet("/api/library",()=>Results.Json(store.Snapshot()));
app.MapPost("/api/mutate",async (HttpRequest req)=>Results.Json(store.Mutate(await ReadJson(req))));

app.MapGet("/api/signs/{identity}",(string identity)=>Results.Json(store.ReadSignDetail(identity)));
app.MapGet("/api/supports/{identity}",(string identity)=>
{
    var tables=store.Tables();
    var row=LibraryStore.Find(tables,"supports","지주기초ID",identity);
    var file=Path.Combine(root,"App_Data/Snapshots/supports",identity+".json");
    if (File.Exists(file))
    {
        var detail=JsonNode.Parse(File.ReadAllText(file))!.AsObject();
        detail["support"]=row.DeepClone();
        return Results.Json(detail);
    }
    return Results.Json(new {support=row, connections=Array.Empty<object>(), quantities=Array.Empty<object>()});
});
app.MapGet("/api/guides/{identity}/image",(string identity)=>
{
    var t=store.Tables();
    var sign=LibraryStore.Find(t,"guidesigns","안내표지ID",identity);
    var code=LibraryStore.Get(sign,"표지번호");
    var refImg=LibraryStore.Get(sign,"도안");
    var folder=Path.Combine(webroot,"static/images");
    foreach (var path in new[]{
        Path.Combine(folder,"guides-cad",code+".svg"),
        Path.Combine(folder,"guides",Path.GetFileName(refImg)),
        Path.Combine(folder,"guides",code+".png")})
    {
        if (File.Exists(path)) return Results.File(path,path.EndsWith(".svg",StringComparison.OrdinalIgnoreCase)?"image/svg+xml":"image/png");
    }
    return Results.Content(Placeholder("CAD 도안 미연결"),"image/svg+xml");
});
app.MapGet("/api/signs/{identity}/image",(string identity)=>
{
    var sign=LibraryStore.Find(store.Tables(),"signs","표지ID",identity);
    var block=LibraryStore.Get(sign,"CAD블록명");
    var path=Path.Combine(webroot,"static/images/traffic-cad",Path.GetFileName(block)+".svg");
    return File.Exists(path)?Results.File(path,"image/svg+xml"):Results.Content(Placeholder("이미지 미등록"),"image/svg+xml");
});

// Preserved read-only reference material generated by the original Python back-end.
app.MapGet("/api/guide-standards",()=>Results.Json(store.ReadSource("guide-standards")));
app.MapGet("/api/guide-registration",(bool? cadFirst)=>
{
    var result=store.ReadSource("guide-registration");
    if (cadFirst == true) result["plates"]=new JsonArray();
    return Results.Json(result);
});
app.MapGet("/api/guide-assets",()=>Results.Json(store.ReadSource("guide-assets")));
app.MapGet("/api/cad/blocks",() => Results.File(Path.Combine(root,"App_Data/cad-blocks.json"),"application/json"));
app.MapGet("/api/cad/attributes",(string sign_id)=>
{
    var sign=LibraryStore.Find(store.Tables(),"signs","표지ID",sign_id);
    return Results.Json(new {attributes=GetAttributes(LibraryStore.Get(sign,"CAD블록명"))});
});
app.MapGet("/api/cad/block-attributes",(string block)=>Results.Json(GetAttributes(block)));
app.MapPost("/api/cad/preview",async (HttpRequest req)=>
{
    var body=await ReadJson(req);
    var sign=LibraryStore.Find(store.Tables(),"signs","표지ID",LibraryStore.Get(body,"sign_id"));
    var block=LibraryStore.Get(sign,"CAD블록명");
    var path=Path.Combine(webroot,"static/images/traffic-cad",Path.GetFileName(block)+".svg");
    var svg=File.Exists(path)?await File.ReadAllTextAsync(path):Placeholder("CAD 미리보기 미등록");
    return Results.Json(new {svg,attributes=GetAttributes(block),panels=Array.Empty<object>(),textures=Array.Empty<string>(),warnings=new[]{"이 C# 버전은 사용자 문구를 SVG에 재렌더링하지 않습니다."},method="static"});
});
app.MapPost("/api/guides/cad-preview",async (HttpRequest req)=>
{
    var body=await ReadJson(req);
    var sign=LibraryStore.Find(store.Tables(),"guidesigns","안내표지ID",LibraryStore.Get(body,"id"));
    var code=LibraryStore.Get(sign,"표지번호");
    var block=LibraryStore.Get(sign,"CAD블록명");
    if (string.IsNullOrWhiteSpace(block) || block=="-") block="CMRG"+code;
    var path=Path.Combine(webroot,"static/images/guides-cad",Path.GetFileName(code)+".svg");
    var svg=File.Exists(path)?await File.ReadAllTextAsync(path):Placeholder("CAD 도안 미연결");
    var fields=new JsonArray();
    try
    {
        var definitions=JsonNode.Parse(LibraryStore.Get(sign,"입력항목"))?.AsArray();
        foreach (var item in definitions ?? new JsonArray())
        {
            var variable=LibraryStore.Get(item,"variable");
            fields.Add(new JsonObject{["tag"]=variable,["variable"]=variable,
                ["index"]=item?["index"]?.DeepClone(),["label"]=LibraryStore.Get(item,"name"),
                ["value"]=body["values"]?[variable]?.ToString()??""});
        }
    }
    catch (JsonException) { }
    return Results.Json(new {block,available=File.Exists(path),fields,missing=Array.Empty<object>(),
        notes=new[]{"원본 CAD의 정적 도안을 표시합니다. 변수 문구 재렌더링은 아직 미구현입니다."},
        svg,panels=Array.Empty<object>(),textures=Array.Empty<object>(),warnings=Array.Empty<string>(),blocks=new[]{block}});
});
app.MapGet("/api/guide-cad-file",(string key)=>Results.Json(new {key,filename="",blocks=Array.Empty<object>(),message="신규 CAD 업로드는 아직 C#으로 이식되지 않았습니다."}));
app.MapGet("/api/guide-pieces",()=>Results.Json(new {assets=Array.Empty<object>()}));

app.MapGet("/api/supports/{identity}/model",(string identity)=>
{
    LibraryStore.Find(store.Tables(),"supports","지주기초ID",identity);
    var filename=Path.Combine(root,"App_Data/Snapshots/SupportModels",identity+".json");
    return File.Exists(filename) ? Results.File(filename,"application/json") :
        Results.Json(new {available=false,message="연결된 지주 모델이 없습니다."});
});
app.MapGet("/api/guides/{identity}/model",(string identity,string? name)=>
{
    LibraryStore.Find(store.Tables(),"guidesigns","안내표지ID",identity);
    var filename=Path.Combine(root,"App_Data/Snapshots/GuideModels",identity+".json");
    if (File.Exists(filename))
    {
        var model=JsonNode.Parse(File.ReadAllText(filename))!.AsObject();
        if (string.IsNullOrEmpty(name) || LibraryStore.Get(model,"name")==name)
            return Results.Json(model);
    }
    return Results.Json(new {available=false,plate_missing=true,choices=Array.Empty<object>(),
        message="이 표지의 3D 조립 응답은 아직 C#으로 재구현되지 않았습니다."});
});
app.MapGet("/api/signs/{identity}/model",(string identity)=>
{
    LibraryStore.Find(store.Tables(),"signs","표지ID",identity);
    return Results.Json(new {available=false,faces=Array.Empty<object>(),vertices=Array.Empty<object>(),
        message="교통표지 3D OBJ 조립 기능은 아직 C#으로 이식되지 않았습니다."});
});
app.MapGet("/api/guide-assets/{key}/image",(string key)=>
{
    if (!System.Text.RegularExpressions.Regex.IsMatch(key,@"^background_[0-9a-f]{64}$"))
        throw new ApiException(404,"등록된 배경 이미지가 아닙니다.");
    var folder=Path.Combine(root,"SourceAssets/app-data/guide-assets",key);
    var file=Path.Combine(folder,"image.png");
    return File.Exists(file)?Results.File(file,"image/png"):
        Results.Json(new {detail="배경 이미지가 없습니다."},statusCode:404);
});
app.MapGet("/api/guide-assets/{key}/outline",(string key)=>
{
    if (!System.Text.RegularExpressions.Regex.IsMatch(key,@"^piece_[0-9a-f]{64}$"))
        throw new ApiException(404,"개별 판이 아닙니다.");
    var path=Path.Combine(root,"SourceAssets/app-data/guide-assets",key,"asset.json");
    if(!File.Exists(path)) throw new ApiException(404,"판 원본이 없습니다.");
    var data=JsonNode.Parse(File.ReadAllText(path))!;
    var width=double.TryParse(LibraryStore.Get(data,"B"),out var w)?w:1000;
    var height=double.TryParse(LibraryStore.Get(data,"H"),out var h)?h:1000;
    var svg=$"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {width} {height}'><rect x='0' y='0' width='{width}' height='{height}' fill='white' stroke='#245db0' stroke-width='10'/></svg>";
    return Results.Content(svg,"image/svg+xml");
});
app.MapGet("/api/impact",(string kind,string identity)=>
{
    var t=store.Tables();
    var matches=kind switch
    {
        "표지"=>t["signs"]!.AsArray().Where(r=>LibraryStore.Get(r,"표지ID")==identity),
        "안내지주"=>t["guiderules"]!.AsArray().Where(r=>LibraryStore.Get(r,"지주형식")==identity)
            .Select(r=>t["guidesigns"]!.AsArray().FirstOrDefault(s=>LibraryStore.Get(s,"안내표지ID")==LibraryStore.Get(r,"안내표지ID")))
            .Where(r=>r!=null),
        _=>Enumerable.Empty<JsonNode?>()
    };
    return Results.Json(matches.Select(r=>r!.DeepClone()).ToArray());
});

// Missing features return an explicit error. The UI never displays a false 'saved' status.
app.MapMethods("/api/{**path}",new[]{"GET","POST"},(string path)=>
    Results.Json(new {detail=$"/{path} 기능은 아직 C#으로 변환되지 않았습니다. 원본 데이터는 유지됩니다."},statusCode:501));
app.Run();

static async Task<JsonObject> ReadJson(HttpRequest req)
{
    if (req.ContentLength > 150000) throw new ApiException(413,"전송량이 너무 큽니다.");
    using var memory=new MemoryStream();
    await req.Body.CopyToAsync(memory);
    if (memory.Length > 150000) throw new ApiException(413,"입력량은 150KB 이하여야 합니다.");
    return JsonNode.Parse(Encoding.UTF8.GetString(memory.ToArray())) as JsonObject ?? throw new ApiException(422,"입력 JSON을 확인하세요.");
}
JsonArray GetAttributes(string block)
{
    var path=Path.Combine(root,"App_Data/cad-attributes.json");
    var all=JsonNode.Parse(File.ReadAllText(path))!.AsObject();
    return all[block]?.DeepClone() as JsonArray ?? new JsonArray();
}
static string Placeholder(string label)=>$"<svg xmlns='http://www.w3.org/2000/svg' width='180' height='100'><rect width='180' height='100' fill='#f1f4f2'/><text x='90' y='55' text-anchor='middle' font-size='12' fill='#74867a'>{WebUtility.HtmlEncode(label)}</text></svg>";
