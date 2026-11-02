# 표지판 라이브러리 — C# ASP.NET Core 이식본

## 목적과 이식 방식

2026-11-02 동봉된 Python FastAPI 프로젝트의 **웹 화면 HTML/CSS/JavaScript/이미지(빌드된 JS 포함)는 수정 없이 복사**하고, 서버를 ASP.NET Core 8 Minimal API 방식으로 다시 작성했습니다. `/static/...` 및 `/api/...` 경로를 유지합니다. 따라서 화면의 디자인·메뉴·화면 전환은 원본과 동일하지만 **전체 기능을 1:1로 이식한 완성본은 아닙니다.** 아래 '구현 상태'를 반드시 읽어주세요.

## Windows에서 실행

1. Visual Studio 2022(ASP.NET 및 웹 개발 워크로드)와 .NET 8 SDK 설치.
2. 전체 압축을 하나의 폴더에 해제하고 `SignLibraryAspNet.csproj`를 Visual Studio로 엽니다.
3. 시작 프로젝트로 `SignLibraryAspNet`을 설정하고 F5 또는 Ctrl+F5로 실행합니다.
4. 브라우저에서 `http://127.0.0.1:8767/` 접속.
5. 또는 SDK가 PATH에 설정된 환경에서 `실행하기.bat`을 실행합니다.

포트 변경은 `appsettings.json`의 `Urls`를 수정하면 됩니다. 기본적으로 `127.0.0.1`만 리슨하며, 외부 네트워크 접속은 허용하지 않습니다. **Python 설치와 FastAPI 서버 실행은 필요하지 않습니다.** Node.js도 필요하지 않으며 원본에 포함된 `wwwroot/static/dist/app.js` 번들을 사용합니다.

## 디렉터리

- `Program.cs`: ASP.NET Core 라우팅, 보안, 정적 파일 전송, 화면 호환 API
- `Services/LibraryStore.cs`: 기존 DB 읽기, 복사본 생성, 버전 충돌 감지, 이력, 디스크 저장
- `Services/MutationService.cs`: C#으로 옮긴 입력 검증 및 저장 동작
- `wwwroot/index.html`, `wwwroot/static/**`: **원본 UI 그대로**(HTML/CSS/JS/PNG/SVG)
- `App_Data/bootstrap.json`: 원본 Python API의 기준 시점 전체 응답(재현용 정적 데이터)
- `App_Data/source-library.json`: 원본 2026-11-02 DB 스냅샷
- `App_Data/Snapshots/Signs/*.json.gz`: 135종 교통표지의 원본 상세 응답(압축)
- `App_Data/Snapshots/supports/*.json`: 지주 14종 상세 응답
- `App_Data/Snapshots/SupportModels/*.json`: 기존 지주 OBJ 분석 결과
- `App_Data/Snapshots/GuideModels/*.json`: 사전에 변환된 일부 안내표지 기본 조립 미리보기
- `SourceAssets/app-data/**`: 동봉됐던 판·OBJ·기초 수량 자료 등
- `App_Data/local-library.json`: 첫 저장부터 **새로 생성**되는 C# 로컬 DB(원본은 수정하지 않음)

## 구현 상태

**동작하는 영역**

- 동일한 웹 화면 정적 파일 서비스, 메인 목록·검색·필터·상세 화면
- `/api/library`, `/api/session`, `/api/health` 및 원본 구조의 초기 상태 제공
- 135종 교통표지의 상세 조회, 14종 지주 기본정보·원본 시점 OBJ 모델 데이터 조회
- 276종 안내표지의 기본 목록·설치 조건·지주 관계 표시(기준 DB 그대로)
- 안내표지 규격/신규등록 후보 등 원본 시점 읽기 전용 참고 데이터
- 교통표지 기본정보 일부, 안내표지 기본정보 일부, 일부 설치 X/Y/Z, 기존 등록 수량 일부의 수정 (지원 항목별 제한 있음)
- 수정 전 버전 확인, 저장 이력 기록, 로컬 JSON 파일로 영속 저장
- 교통표지 기본 CAD SVG 이미지 및 안내표지 정적 CAD SVG 도안 표시
- 사전에 생성한 안내표지 기본 3D 응답 일부, 지주 3D OBJ 응답 일부

**아직 원본과 동등하지 않은 영역**

- CAD DXF/DWG 파일 업로드·ezdxf 분석·속성 텍스트 동적 SVG 재렌더링·문양 매핑
- 전체 OBJ/MTL 분석, 신규 판·지주 OBJ 생성 및 조립, 모델 업로드
- 안내표지 전체 3D 미리보기(일부 모델만 사전 계산했으며 변경/새 조합에는 적용되지 않음)
- 공통 안내판 규격·설치위치·지주 변경에 대한 전체 규칙 검증과 연쇄 동기화
- 교통표지 신규등록과 모든 다중 테이블 편집·자동 수량 계산
- Google Sheets 실시간 저장/동기화, 다중 사용자 계정·권한 관리
- 원본 전체 테스트 통과 재현(이 실행 환경에 .NET SDK가 없어 실제 C# 컴파일/런타임 통합 테스트를 수행하지 못함)

이식되지 않은 API는 **501 응답을 반환하고 데이터를 수정하지 않습니다.** 정상 저장이 된 것처럼 보여 주지 않기 위한 의도적인 보호장치입니다. **실무 운영에 투입하기 전 반드시 테스트하고 누락 로직을 C#으로 이식해야 합니다.**

## 저장/데이터 백업

최초에는 `App_Data/bootstrap.json`의 원본 데이터를 메모리에 로드합니다. 지원되는 저장 동작을 수행하면 `App_Data/local-library.json`에 저장합니다. 이후 재시작 시 이 로컬 파일을 사용합니다. 백업하려면 서버를 중지하고 해당 파일을 다른 위치에 복사하세요. 원본 ZIP, `source-library.json`, `bootstrap.json`은 변경되지 않습니다.

## 기존 Python과 달라진 점

- Python에서 매번 계산하던 보조 정보를 원본 시점 스냅샷으로 제공하며, 저장 시 일부 계산값은 재생성되지 않습니다. UI/데이터 연결의 출발점일 뿐 전체 계산 이식본은 아닙니다.
- Python 메모리 모드와 달리 지원된 수정 사항은 로컬 파일에 **지속 저장**됩니다.
- C# 서버가 Python 서브프로세스를 띄우거나 Python 소스를 호출하지 않습니다.
- 보안상 외부 접속은 기본 차단하며, 기존 Origin/토큰 검사를 유지합니다. 이 검사는 로그인 대체가 아닙니다.

## 개발자 작업 순서

1. `Program.cs`에서 501인 API 목록과 프런트엔드 `wwwroot/static/api.js` 호출을 매핑.
2. `Services/MutationService.cs`에 도메인 규칙을 옮기되 원본의 동일한 입력·검증·ID·DB 동기화를 테스트.
3. 원본 `cad.py`의 ezdxf 처리에 상응하는 C# 라이브러리/변환기 사용 방안을 결정. DWG는 별도 라이선스 확인 필요.
4. 원본 `guide_assembly.py`, `obj_preview.py`, `guide_mapping.py` 처리로 C#의 OBJ 및 정점/면 조립 기능 구현.
5. 실제 운영 DB를 선택하고 동시 사용자 인증·권한·감사·백업을 적용.
6. 원본 Python 테스트/브라우저 결과와 C# API별 회귀 비교 자동화.

## 기타

기본 주소가 사용 중이면 `appsettings.json`에서 포트를 바꿔주세요. 프로덕션 배포를 위해서는 서버 인증·개별 사용자 권한·배포 설정이 별도로 필요합니다. 파일 및 원본 스냅샷은 2026-11-02 동봉 데이터에서 만들었습니다.
