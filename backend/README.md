# backend (서버)

비밀 키가 필요한 API 호출을 화면 대신 처리하는 곳입니다. 키는 루트의 .env 파일에서 읽습니다.

## 켜는 방법
프로젝트 맨 위 폴더(`map-site`)에서 아래 명령을 실행합니다. 화면(frontend)도 이 서버가 함께 보내 줍니다.

```
node backend/server.js
```

주소는 `http://localhost:3000` 입니다. 끄려면 명령을 실행한 창에서 `Ctrl + C`를 누릅니다.

## 서버 주소
| 주소 | 하는 일 | 예시 |
|---|---|---|
| `/api/places/nearby` | 내 주변 장소 (type: food 맛집, spot 관광지, festival 이번 주 축제) | `?lat=35.815&lng=127.153&type=food&radius=2000` |
| `/api/places/search` | 이름으로 검색 (관광공사 + 네이버) | `?q=비빔밥` |
| `/api/places/detail` | 장소 상세 (관광공사 장소 번호) | `?id=126508` |
| `/api/usage` | 오늘 외부 API 호출 횟수 확인 | |

## 지키는 규칙
- 같은 요청은 서버 메모리에 잠깐 기억합니다 (주변 30분, 검색 10분, 상세 6시간). 파일로 저장하지 않습니다.
- 하루 호출 횟수는 `backend/data/usage.json`에 숫자만 저장합니다. 상한: 관광공사 900회, 네이버 2,000회. 상한이 되면 호출을 멈추고 안내 메시지를 보냅니다. (`backend/lib/usage.js`에서 바꿉니다)
- 위치(lat, lng)는 서버 기록(로그)에 남기지 않습니다.
