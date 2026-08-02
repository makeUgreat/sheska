---
title: 프론트엔드 코드 읽기 훈련 가이드
lang: ko
audience: learner
applies_to:
  - apps/ui
---

# 프론트엔드 코드 읽기 훈련 가이드

이 문서는 `apps/ui`의 지금까지 구현된 코드를 읽고 이해하기 위한 개인 학습 노트다.
목표는 React 문법을 한 번에 전부 외우는 것이 아니라, 코드를 읽고 해석해서 좋은 프론트엔드 코드인지 검증하는 역량을 기르는 것이다.

프론트엔드 코드를 읽을 때는 아래 네 가지를 계속 추적한다.

```txt
화면: 사용자가 무엇을 보고 있는가?
상태: 화면이 어떤 상태에 따라 바뀌는가?
이벤트: 사용자의 행동이 어떤 변화를 일으키는가?
데이터: 서버 데이터와 로컬 상태가 어디서 만나고 갈라지는가?
```

## 백엔드 경험을 가진 사람이 가져야 할 읽기 관점

백엔드 코드는 보통 요청 하나의 입력, 처리, 저장, 응답 흐름을 중심으로 읽는다.
프론트엔드 코드는 한 번의 요청보다 긴 시간 동안 유지되는 화면과 사용자 상호작용을 중심으로 읽는다.

백엔드에서 익숙한 질문:

```txt
이 API의 입력과 출력은 무엇인가?
트랜잭션 경계는 어디인가?
비즈니스 규칙은 어디에 있는가?
실패하면 어떤 에러를 반환하는가?
```

프론트엔드에서 추가로 해야 하는 질문:

```txt
처음 렌더링될 때 무엇이 보이는가?
로딩 중에는 무엇이 보이는가?
데이터가 없을 때는 무엇이 보이는가?
에러가 났을 때 사용자는 무엇을 할 수 있는가?
사용자가 클릭, 입력, 스크롤하면 어떤 state가 바뀌는가?
서버 데이터와 입력 중인 임시 데이터가 섞이지 않는가?
화면이 다시 렌더링되어도 의도한 상태가 유지되는가?
```

프론트엔드 코드는 백엔드보다 일회성 UI 코드가 많다.
모든 JSX 조각을 재사용 컴포넌트로 뽑는 것이 좋은 코드는 아니다.
특정 화면에서만 쓰이고, 그 화면의 맥락을 이해해야 의미가 있는 UI는 페이지 안에 그대로 있는 편이 더 읽기 쉬울 수 있다.

대신 아래 기준을 본다.

```txt
재사용되는가?
복잡한 조건 분기가 있는가?
상태를 직접 가진 독립적인 UI인가?
여러 페이지에서 같은 의미로 쓰이는가?
분리했을 때 이름이 명확해지는가?
```

위 질문에 대부분 yes라면 컴포넌트 분리가 좋을 가능성이 높다.
대부분 no라면 억지로 분리하지 않아도 된다.

## 좋은 프론트엔드 코드인지 판단하는 기준

좋은 프론트엔드 코드는 예쁜 코드만 뜻하지 않는다.
사용자의 상황 변화에 대해 예측 가능하게 반응하고, 코드를 읽는 사람이 화면의 흐름을 추적할 수 있어야 한다.

코드를 읽을 때 아래 기준으로 본다.

```txt
1. 화면 구조가 명확한가?
2. state의 소유자가 적절한가?
3. 서버 데이터와 로컬 UI state가 구분되는가?
4. 로딩, 에러, 빈 상태가 빠지지 않았는가?
5. 사용자 이벤트가 어떤 변화를 만드는지 추적 가능한가?
6. 컴포넌트 이름이 역할을 설명하는가?
7. props가 너무 넓거나 애매하지 않은가?
8. 같은 조건식이나 UI 조각이 의미 없이 반복되지 않는가?
9. 스타일 코드 때문에 동작 의도가 묻히지 않는가?
10. 테스트가 중요한 사용자 동작을 검증하는가?
```

백엔드 코드 리뷰에서 transaction, validation, persistence boundary를 보듯이, 프론트엔드에서는 state boundary, rendering branch, user interaction, async data boundary를 본다.

## 프론트엔드 독해의 핵심 단위

프론트엔드 코드를 읽을 때 파일 단위만 보면 흐름이 잘 안 보일 수 있다.
아래 단위로 잘라서 읽는다.

### Route

사용자가 어떤 URL에 들어왔을 때 어떤 페이지 컴포넌트가 열리는지 본다.

예:

```txt
/posts/:id
-> PostDetailPage
```

### Page

페이지는 보통 화면의 큰 흐름을 소유한다.
API 호출, URL parameter, 주요 state, loading/error/success 분기가 페이지에 모인다.

페이지를 읽을 때는 세부 JSX보다 먼저 아래를 찾는다.

```txt
URL에서 가져오는 값
API hook
useState
event handler
return 안의 큰 조건 분기
```

### Component

컴포넌트는 화면 일부를 표현한다.
좋은 컴포넌트는 이름만 보고 역할을 어느 정도 예상할 수 있다.

컴포넌트를 읽을 때는 아래를 본다.

```txt
이 컴포넌트가 직접 state를 가지는가?
props로 무엇을 받는가?
사용자 이벤트를 직접 처리하는가?
아니면 받은 값을 보여주기만 하는가?
```

### Hook

Hook은 상태 관리나 side effect를 숨긴다.
`usePost`, `useInfiniteListPosts` 같은 hook은 API 데이터 흐름을 숨기고 있으므로 반드시 내부를 확인한다.

Hook을 읽을 때는 아래를 본다.

```txt
무엇을 입력으로 받는가?
무엇을 반환하는가?
캐시 key는 무엇인가?
언제 요청을 실행하고 언제 멈추는가?
성공 후 어떤 cache invalidation을 하는가?
```

## 1단계: 앱 전체 흐름 읽기

먼저 아래 세 파일만 본다.

1. `package.json`
   - 이 앱이 어떤 기술을 쓰는지 확인한다.
   - React, Vite, React Router, TanStack Query가 보이면 충분하다.

2. `src/main.tsx`
   - 앱의 시작점이다.
   - `BrowserRouter`, `QueryClientProvider`, `ApiClientProvider`가 왜 `App`을 감싸는지 본다.

3. `src/App.tsx`
   - 라우팅을 확인한다.
   - 예를 들어 `/posts/:id`로 들어가면 `PostDetailPage`가 열린다는 식으로 화면 연결을 파악한다.

읽을 때 질문:

```txt
이 파일은 앱에서 어떤 역할을 하지?
어떤 컴포넌트를 불러오지?
사용자가 어떤 URL로 들어오면 어떤 화면이 보이지?
```

## 2단계: 쉬운 페이지부터 읽기

`src/pages/MainPage.tsx`는 바로 깊게 읽지 않는다.
상태, 스크롤, 검색, 무한 로딩이 섞여 있어서 초보자에게는 복잡하다.

먼저 아래 순서로 읽는다.

1. `src/pages/PostDetailPage.tsx`
2. `src/pages/SourceListPage.tsx`
3. `src/pages/SourceDetailPage.tsx`

`PostDetailPage`를 읽을 때는 아래처럼 나눠서 본다.

```txt
1. URL에서 id를 가져오는 부분은 어디인가?
2. API 데이터를 가져오는 부분은 어디인가?
3. 로딩 / 에러 / 성공 화면은 어떻게 나뉘는가?
4. 제목 수정 상태는 어떤 state로 관리되는가?
5. 저장 버튼을 누르면 어떤 함수가 실행되는가?
```

그다음 품질 관점으로 한 번 더 읽는다.

```txt
로딩 상태가 사용자에게 보이는가?
에러 상태가 사용자에게 보이는가?
수정 중인 제목 draft와 서버의 post.title이 분리되어 있는가?
저장 중 중복 클릭을 막는가?
성공 후 화면 상태가 자연스럽게 돌아오는가?
```

## 3단계: 컴포넌트 분리 이해하기

페이지 파일을 읽다가 모르는 컴포넌트가 나오면 그 컴포넌트 파일로 이동한다.

예:

```tsx
<ActionLink to="/posts" className="mb-8">
  Back to posts
</ActionLink>
```

이 코드를 보면 `src/components/ui/action-link.tsx`를 읽는다.

컴포넌트를 읽을 때는 아래 질문을 사용한다.

```txt
props로 무엇을 받지?
return 안에서 어떤 HTML을 만들지?
className은 어떤 스타일을 주지?
이 컴포넌트는 재사용용인가, 특정 화면 전용인가?
```

컴포넌트를 분리해야 하는지 판단할 때는 아래처럼 생각한다.

```txt
이름을 붙이면 화면 이해가 쉬워지는가?
이 컴포넌트를 다른 곳에서도 같은 의미로 쓸 수 있는가?
props가 너무 많아져서 오히려 읽기 어려워지지는 않는가?
분리 후에도 상위 페이지의 흐름이 자연스럽게 보이는가?
```

추천 읽기 순서:

1. `src/components/ui/status-message.tsx`
2. `src/components/ui/tag.tsx`
3. `src/components/ui/action-link.tsx`
4. `src/components/post/post-card.tsx`
5. `src/components/post/posts-list-section.tsx`

## 4단계: API 흐름 읽기

화면에서 `usePost`, `useInfiniteListPosts` 같은 코드가 나오면 `src/api/queries.ts`를 본다.
그다음 `src/api/client.ts`를 본다.

흐름은 보통 아래와 같다.

```txt
Page component
-> React Query hook
-> SheskaApiClient method
-> HttpClient
-> 실제 API 요청
```

예:

```txt
PostDetailPage
-> usePost(id)
-> apiClient.getPost(id)
-> GET /posts/:id
-> post 데이터가 화면에 표시됨
```

이 흐름을 손으로 직접 적어보는 연습이 중요하다.

API 흐름을 읽을 때는 백엔드의 contract 관점을 사용해도 좋다.
다만 프론트엔드에서는 contract가 화면 상태로 어떻게 번역되는지도 같이 봐야 한다.

```txt
API 응답 type은 무엇인가?
undefined/null 가능성은 화면에서 처리되는가?
pagination cursor는 어디서 다음 요청으로 이어지는가?
mutation 성공 후 기존 list/detail cache는 갱신되는가?
API 에러는 사용자에게 보이는 메시지로 바뀌는가?
```

## 5단계: MainPage는 마지막에 읽기

`src/pages/MainPage.tsx`는 이 UI 앱에서 복잡한 편이다.
처음부터 전체를 이해하려 하지 말고 기능별로 나눠서 본다.

나눠서 볼 기능:

```txt
검색어 상태
게시글 개수 가져오기
게시글 목록 가져오기
무한 스크롤
첫 화면에서 게시글 영역으로 진입하는 스크롤 연출
로딩/전환 애니메이션 상태
```

`useState`, `useEffect`, `useRef`, `useCallback`이 많이 나오기 때문에 한 번에 이해하기 어렵다.
어려운 것이 정상이다.

`MainPage`를 품질 관점으로 볼 때는 특히 아래를 본다.

```txt
상태 이름만 보고 의미를 추측할 수 있는가?
여러 boolean state 조합이 불가능한 상태를 만들지 않는가?
scroll, timer, observer 같은 browser side effect가 cleanup되는가?
검색 상태와 목록 상태가 명확히 분리되는가?
사용자 입장에서 중간 상태가 어색하지 않은가?
```

복잡한 프론트엔드 코드는 상태 조합이 품질의 핵심이다.
백엔드에서 domain invariant를 보듯이, 프론트엔드에서는 UI state invariant를 본다.

예:

```txt
isPreparingPosts와 hasEnteredPosts가 동시에 true여도 되는가?
isSearching이 true일 때 listResult가 화면에 섞이지 않는가?
timer가 끝난 뒤 컴포넌트가 사라졌다면 setState가 발생하지 않는가?
```

## 코드 리뷰 관점으로 읽는 훈련

코드를 한 번 이해한 뒤에는 리뷰어처럼 다시 읽는다.
이때는 “무슨 뜻인지 알겠다”에서 멈추지 않고 “이 구조가 유지보수 가능한가?”를 묻는다.

좋은 질문:

```txt
이 state는 꼭 여기 있어야 하는가?
이 컴포넌트는 너무 많은 책임을 갖고 있지 않은가?
같은 데이터를 서버 state와 local state에 중복 저장하고 있지 않은가?
조건부 렌더링이 너무 깊어져서 상태를 놓치기 쉽지 않은가?
에러와 빈 상태가 happy path만큼 잘 보이는가?
이름만 보고 역할을 이해할 수 있는가?
테스트가 구현 세부사항이 아니라 사용자 행동을 검증하는가?
```

나쁜 신호:

```txt
boolean state가 많고 가능한 조합을 알기 어렵다.
props 이름이 value, data, item처럼 너무 일반적이다.
컴포넌트가 API 호출, form state, layout, animation을 모두 직접 처리한다.
loading/error/empty 상태 중 하나가 빠져 있다.
useEffect 안에서 무슨 일이 일어나는지 한 번에 추적하기 어렵다.
같은 서버 데이터를 여러 local state로 복사한다.
버튼을 누른 뒤 실패했을 때 사용자가 무엇을 해야 하는지 알 수 없다.
```

좋은 신호:

```txt
페이지에서 데이터 흐름과 사용자 흐름이 먼저 보인다.
서버 state는 React Query가 관리하고, 입력 중인 값만 local state로 둔다.
작은 UI 컴포넌트는 props와 rendering 책임이 단순하다.
event handler 이름이 사용자 행동을 설명한다.
loading, error, empty, success 상태가 명시적이다.
side effect에는 cleanup이 있다.
테스트가 사용자가 보는 결과를 기준으로 작성되어 있다.
```

## 추천 훈련 루틴

하루 30분에서 40분 정도를 기준으로 한다.

1일차:
`src/main.tsx`, `src/App.tsx`를 읽고 라우팅 그림을 그린다.

2일차:
`src/pages/PostDetailPage.tsx`를 읽고 데이터 흐름을 적는다.

3일차:
`src/pages/PostDetailPage.tsx`의 제목 수정 기능만 따로 추적한다.

4일차:
`src/components/ui` 안의 작은 컴포넌트를 읽는다.

5일차:
`src/api/client.ts`, `src/api/queries.ts`를 읽고 API 흐름을 적는다.

6일차:
`src/components/post/post-card.tsx`, `src/components/post/posts-list-section.tsx`를 읽는다.

7일차:
`src/pages/MainPage.tsx`를 기능 단위로 나눠서 읽는다.

8일차:
`src/pages/PostDetailPage.tsx`를 코드 리뷰 관점으로 다시 읽고 좋은 신호와 나쁜 신호를 적는다.

9일차:
`src/api/queries.ts`에서 query와 mutation의 cache key, invalidation 흐름을 추적한다.

10일차:
`src/pages/MainPage.tsx`의 boolean state 목록을 적고 가능한 상태 조합을 생각해본다.

## 코드 읽기 템플릿

파일 하나를 읽을 때마다 아래 양식으로 정리한다.

```txt
파일명:

이 파일의 역할:

외부에서 import하는 것:

이 파일이 export하는 것:

중요한 state:

중요한 함수:

사용자 행동과 연결되는 부분:

로딩 / 에러 / 빈 상태 처리:

서버 state와 local state:

좋아 보이는 점:

불안하거나 더 확인하고 싶은 점:

아직 이해 안 되는 부분:
```

예:

```txt
파일명: PostDetailPage.tsx

이 파일의 역할:
게시글 상세 화면을 보여주고 제목 수정 기능을 제공한다.

중요한 state:
editing, draftTitle

사용자 행동:
Edit 버튼 클릭 -> handleEditStart
Save 버튼 클릭 -> handleSave
Escape 입력 -> handleCancel

서버 state와 local state:
post는 서버에서 온 데이터이고, draftTitle은 사용자가 수정 중인 임시 local state다.

좋아 보이는 점:
저장 중 버튼을 disabled 처리한다.

더 확인하고 싶은 점:
저장 실패 후 사용자가 다시 시도하기 쉬운가?
```

## 백엔드 관점과 연결해서 정리하는 템플릿

백엔드 경험을 살려 아래처럼 대응시켜 본다.

```txt
백엔드의 request handler에 해당하는 것:
프론트엔드의 page component

백엔드의 service method에 해당하는 것:
프론트엔드의 hook 또는 event handler

백엔드의 repository/client에 해당하는 것:
프론트엔드의 API client

백엔드의 validation/error handling에 해당하는 것:
프론트엔드의 form validation, disabled state, error UI

백엔드의 transaction/invariant에 해당하는 것:
프론트엔드의 UI state invariant
```

주의할 점은 프론트엔드에는 순수한 계층 구조로만 설명되지 않는 코드가 많다는 것이다.
화면, 스타일, 상태, 이벤트가 같은 컴포넌트 안에 함께 있는 경우가 자연스럽다.
무조건 백엔드식 계층 분리를 적용하려고 하면 오히려 UI 흐름이 읽기 어려워질 수 있다.

## 지금 바로 시작할 순서

아래 순서대로 읽는다.

```txt
src/main.tsx
src/App.tsx
src/pages/PostDetailPage.tsx
src/api/queries.ts
src/api/client.ts
src/components/ui/status-message.tsx
```

코드를 읽다가 모르는 줄이 있으면 그 줄을 여기에 붙여두고 질문한다.

## 궁금한 점

아래에 질문을 추가한다.

```txt
예:
- src/App.tsx에서 useLocation은 왜 쓰는가?
- QueryClientProvider는 왜 main.tsx에 있는가?
- usePost(id)는 실제로 어디서 API를 호출하는가?
```
