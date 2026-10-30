import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import FriendPage from "./FriendPage";
import FriendSearch from "./FriendSearch";
import api from "../../Api";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("../../Api", () => ({
  __esModule: true,
  default: { get: jest.fn(), delete: jest.fn(), post: jest.fn() },
}));

const users = [
  { userId: 42, userName: "서버친구#1234", introduction: "서버 소개", profileImageUrl: null },
  { userId: 81, userName: "다른친구", introduction: null, profileImageUrl: null },
];
const response = (result = users) => ({ data: { isSuccess: true, result } });
const candidate = { userId: 99, userName: "새친구#5678", introduction: "새 소개" };
const candidateResponse = (content = [candidate], totalPages = 1) => response({ content, totalPages });

test("팔로우 성공 전에는 추가하지 않고 서버 응답으로 한 번 추가한 뒤 언팔로우할 수 있다", async () => {
  let finish;
  let followed = false;
  api.get.mockImplementation((url) => Promise.resolve(url === "/api/follow/followings"
    ? response() : candidateResponse(followed ? [] : [candidate])));
  api.post.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  api.delete.mockResolvedValue(response(null));
  render(<FriendPage />);
  const follow = await screen.findByRole("button", { name: "팔로우" });
  const list = screen.getByRole("heading", { name: "팔로우 목록" }).closest("section");
  fireEvent.click(follow);
  fireEvent.click(follow);
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith("/api/follow", { toUserId: 99 });
  expect(within(list).queryByText("새친구")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "처리 중..." })).toBeDisabled();
  followed = true;
  await act(async () => finish(response(candidate)));
  expect(within(list).getAllByText("새친구")).toHaveLength(1);
  await screen.findByText("팔로우 가능한 사용자가 없습니다.");
  fireEvent.click(within(within(list).getByText("새친구").closest("li")).getByRole("button", { name: "삭제" }));
  followed = false;
  fireEvent.click(screen.getByRole("button", { name: "예" }));
  await waitFor(() => expect(within(list).queryByText("새친구")).not.toBeInTheDocument());
  expect(await screen.findByRole("button", { name: "팔로우" })).toBeEnabled();
});

test.each(["network", "business", "malformed"])("팔로우 %s 실패는 목록을 바꾸지 않고 재시도한다", async (failure) => {
  api.get.mockImplementation((url) => Promise.resolve(url === "/api/follow/followings" ? response() : candidateResponse()));
  if (failure === "network") api.post.mockRejectedValueOnce(new Error("offline"));
  else api.post.mockResolvedValueOnce(failure === "business" ? { data: { isSuccess: false } } : response({}));
  api.post.mockResolvedValueOnce(response(candidate));
  render(<FriendPage />);
  fireEvent.click(await screen.findByRole("button", { name: "팔로우" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("팔로우에 실패");
  const list = screen.getByRole("heading", { name: "팔로우 목록" }).closest("section");
  expect(within(list).queryByText("새친구")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "팔로우" }));
  await waitFor(() => expect(within(list).getByText("새친구")).toBeInTheDocument());
  expect(api.post).toHaveBeenCalledTimes(2);
});

test("검색에는 nickname과 페이지를 사용하고 검색어 변경 시 첫 페이지로 돌아간다", async () => {
  api.get.mockResolvedValue(candidateResponse([candidate], 2));
  render(<FriendSearch />);
  await screen.findByText("새친구");
  expect(api.get).toHaveBeenLastCalledWith("/api/follow", expect.objectContaining({ params: { page: 0, size: 10, sort: "id,ASC" } }));
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  await screen.findByText("2 / 2");
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "  새친구  " } });
  await screen.findByText("1 / 2");
  expect(api.get).toHaveBeenLastCalledWith("/api/follow/search", expect.objectContaining({ params: { nickname: "새친구", page: 0, size: 10, sort: "id,ASC" } }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
  await screen.findByText("새친구");
  expect(api.get.mock.calls.at(-1)[0]).toBe("/api/follow");
});

test("늦게 도착한 이전 검색 결과는 현재 결과를 덮어쓰지 않는다", async () => {
  let finishOld;
  api.get.mockImplementation((url, options) => {
    if (options.params.nickname === "이전") return new Promise((resolve) => { finishOld = resolve; });
    return Promise.resolve(candidateResponse());
  });
  render(<FriendSearch />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "이전" } });
  await waitFor(() => expect(finishOld).toBeDefined());
  const oldSignal = api.get.mock.calls.find(([, options]) => options.params.nickname === "이전")[1].signal;
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "최신" } });
  expect(oldSignal.aborted).toBe(true);
  await screen.findByText("새친구");
  await act(async () => finishOld(candidateResponse([{ userId: 8, userName: "오래된결과" }])));
  expect(screen.queryByText("오래된결과")).not.toBeInTheDocument();
});

test("검색 실패 재시도와 정상 빈 결과를 구분한다", async () => {
  api.get.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(candidateResponse([], 0));
  render(<FriendSearch />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "없는이름" } });
  expect(await screen.findByRole("alert")).toHaveTextContent("불러오지 못했습니다");
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  expect(await screen.findByText("검색 결과가 없습니다.")).toBeInTheDocument();
});

test("관계 변경 후 마지막 페이지가 사라지면 이전 페이지를 조회한다", async () => {
  api.get.mockResolvedValue(candidateResponse([candidate], 2));
  const { rerender } = render(<FriendSearch />);
  await screen.findByText("새친구");
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  await screen.findByText("2 / 2");
  api.get.mockImplementation((url, options) => Promise.resolve(candidateResponse(options.params.page === 0 ? [candidate] : [], 1)));
  rerender(<FriendSearch refreshKey={1} />);
  await waitFor(() => expect(api.get.mock.calls.at(-1)[1].params.page).toBe(0));
  await screen.findByText("새친구");
});

beforeEach(() => {
  jest.resetAllMocks();
  api.get.mockImplementation((url) => Promise.resolve(url === "/api/follow/followings" ? response() : response({ content: [], totalPages: 0 })));
});



test("조회 중 표시 후 서버 데이터를 UI 형태로 표시한다", async () => {
  render(<FriendPage />);
  expect(screen.getByText("팔로우 목록을 불러오는 중...")).toBeInTheDocument();
  expect(await screen.findByText("서버친구")).toBeInTheDocument();
  expect(screen.getByText("#1234")).toBeInTheDocument();
  expect(screen.getByText("서버 소개")).toBeInTheDocument();
  expect(screen.getByText("다른친구").closest("li").querySelector(".friend-info__tag")).toBeNull();
});

test("정상적인 빈 배열은 오류와 구분한다", async () => {
  api.get.mockResolvedValueOnce(response([]));
  render(<FriendPage />);
  expect(await screen.findByText("팔로우하는 친구가 없습니다.")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test.each([
  { isSuccess: false, result: [] },
  { isSuccess: true, result: {} },
  { isSuccess: true, result: [{ userName: "ID 없음" }] },
])("잘못된 조회 응답을 오류로 표시하고 재시도한다: %j", async (data) => {
  api.get.mockResolvedValueOnce({ data });
  render(<FriendPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("불러오지 못했습니다");
  expect(screen.queryByText("팔로우하는 친구가 없습니다.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  expect(await screen.findByText("서버친구")).toBeInTheDocument();
});

test("삭제 성공 전에는 목록을 유지하고 중복 요청과 모달 닫기를 막는다", async () => {
  let finishDelete;
  api.delete.mockImplementationOnce(() => new Promise((resolve) => { finishDelete = resolve; }));
  render(<FriendPage />);
  await screen.findByText("서버친구");
  fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);
  const dialog = screen.getByRole("dialog");
  const yes = within(dialog).getByRole("button", { name: "예" });
  fireEvent.click(yes);
  fireEvent.click(yes);
  expect(api.delete).toHaveBeenCalledTimes(1);
  expect(api.delete).toHaveBeenCalledWith("/api/follow", { data: { toUserId: 42 } });
  expect(yes).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "아니오" })).toBeDisabled();
  expect(screen.getByText("서버 소개")).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.click(dialog.parentElement);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  await act(async () => { finishDelete({ data: { isSuccess: true } }); });
  expect(screen.queryByText("서버친구")).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("다른친구")).toBeInTheDocument();
  expect(api.get.mock.calls.filter(([url]) => url === "/api/follow/followings")).toHaveLength(1);
});

test.each(["network", "business"])("언팔로우 %s 실패 시 목록 유지 후 재시도 가능", async (failure) => {
  if (failure === "network") api.delete.mockRejectedValueOnce(new Error("offline"));
  else api.delete.mockResolvedValueOnce({ data: { isSuccess: false } });
  api.delete.mockResolvedValueOnce({ data: { isSuccess: true } });
  render(<FriendPage />);
  await screen.findByText("서버친구");
  fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "예" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("언팔로우에 실패");
  expect(screen.getByText("서버 소개")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "예" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "예" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.queryByText("서버친구")).not.toBeInTheDocument();
});

test("취소하면 삭제 API를 호출하지 않는다", async () => {
  render(<FriendPage />);
  await screen.findByText("서버친구");
  fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "아니오" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(api.delete).not.toHaveBeenCalled();
  expect(screen.getByText("서버친구")).toBeInTheDocument();
});

test("화면을 벗어나면 조회 요청을 취소한다", () => {
  api.get.mockImplementationOnce(() => new Promise(() => {}));
  const { unmount } = render(<FriendPage />);
  const { signal } = api.get.mock.calls[0][1];
  expect(signal.aborted).toBe(false);
  unmount();
  expect(signal.aborted).toBe(true);
});

