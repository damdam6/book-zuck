# 북적이 (book-zuck)

독서 모임 커뮤니티 사이트. 사용자가 책을 모으고(책장), 책마다 발제를 등록·공유하며,
모임 음성 녹음을 업로드해 한국어로 전사한다. React 프런트엔드 + Supabase 백엔드로
이루어진 단일 컨텍스트 앱이다.

## Language

**Book**:
북적이의 핵심 도메인 엔티티 — 한 권의 책. Supabase `books` 테이블에 저장되며 `id`,
`title`, `author`, `created_at` 형태를 가진다.
_Avoid_: Item, Product

**Bookshelf**:
사용자가 모은 **Book** 목록. `/bookshelf` 화면이 이를 보여준다.
_Avoid_: Library, Collection

**Agenda**:
한 **Book**에 대해 사용자가 등록하는 발제(토론 주제). `/agenda/new`에서 등록하고
`/books/:bookId/agenda`에서 책별로 조회한다.
_Avoid_: Topic, Discussion, Question

**Transcription**:
업로드된 모임 음성을 한국어 텍스트로 변환한 결과 레코드. 클라이언트가 상태
(`idle`→`uploading`→`transcribing`→`completed`/`failed`)를 폴링한다.
_Avoid_: STT result, Script

**Utterance**:
**Transcription**을 구성하는 개별 발화 단위. `start_at`, `duration`, `msg`,
`spk`(화자), `lang` 필드를 가진다.
_Avoid_: Segment, Line

## Relationships

- 한 **Book**은 여러 **Agenda**를 가진다
- **Bookshelf**는 여러 **Book**을 나열한다
- 하나의 **Transcription**은 여러 **Utterance**로 구성된다

## Example dialogue

> **개발자:** "사용자가 **Bookshelf**에서 책을 고르면 바로 **Agenda**를 달 수 있나요?"
> **도메인 전문가:** "네 — 다만 **Agenda**는 항상 특정 **Book**에 속합니다. 책 없는 발제는 없어요."
> **개발자:** "모임 녹음은요?"
> **도메인 전문가:** "녹음을 올리면 **Transcription**이 생기고, 그 안의 **Utterance**들이 화자별 발화로 쪼개집니다."

## Flagged ambiguities

- "발제"는 **Agenda**로 통일한다(코드/라우트가 `agenda`를 사용). "Topic"·"Question"은 쓰지 않는다.
- "전사 결과"는 레코드 전체를 가리키면 **Transcription**, 개별 발화 한 줄이면 **Utterance**로 구분한다.
