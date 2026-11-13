import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Todo from "./Todo";
import { get, post, put, patch, del } from "../../Api";

jest.mock("../../Api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() }));

const date = new Date(2026, 10, 13);
const item = { id: 7, text: "Read", category: "Study", completed: false };
const ok = (result) => ({ isSuccess: true, result });
let refresh;
let setTodos;

beforeEach(() => {
    jest.resetAllMocks();
    refresh = jest.fn();
    setTodos = jest.fn();
    get.mockImplementation((url) => Promise.resolve(url === "/api/categories"
        ? ok([{ categoryName: "Study" }])
        : ok({ todoId: 7, description: "Read", categoryName: "Study", routineEnabled: true,
            startDate: "2026-11-13", endDate: "2026-12-13", week: "FRI" })));
    [post, put, patch, del].forEach((fn) => fn.mockResolvedValue(ok({})));
});

const mount = () => render(<Todo selectedDate={date} todosByDate={{ "2026-11-13": [item] }}
    setTodosByDate={setTodos} onCompletedChange={refresh} />);

test("creates on the selected date with the server DTO and refreshes", async () => {
    mount();
    await screen.findByText("Read");
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/categories"));
    fireEvent.click(screen.getByText("+"));
    fireEvent.change(screen.getByPlaceholderText("내용을 입력해주세요"), { target: { value: "Write" } });
    fireEvent.click(screen.getByText("저장"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/todos", {
        description: "Write", categoryName: "Study", routineEnabled: false,
        startDate: null, endDate: null, week: null,
    }, { params: { date: "2026-11-13" } }));
    expect(refresh).toHaveBeenCalledTimes(1);
});

test("loads detail and preserves the routine when updating", async () => {
    mount();
    fireEvent.click(screen.getByText("Read"));
    await screen.findByText("할 일 수정하기");
    fireEvent.change(screen.getByPlaceholderText("내용을 입력해주세요"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByText("저장"));
    await waitFor(() => expect(put).toHaveBeenCalledWith("/api/todos/7", {
        description: "Updated", categoryName: "Study", routineEnabled: true,
        startDate: "2026-11-13", endDate: "2026-12-13", week: "FRI",
    }));
    expect(refresh).toHaveBeenCalledTimes(1);
});

test("deletes only the selected occurrence", async () => {
    mount();
    fireEvent.click(screen.getByText("Read"));
    await screen.findByText("할 일 수정하기");
    fireEvent.click(screen.getByText("삭제"));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/api/todos/7/dates/2026-11-13"));
    expect(refresh).toHaveBeenCalledTimes(1);
});

test("sends completion and prevents duplicate in-flight requests", async () => {
    let resolve;
    patch.mockReturnValue(new Promise((done) => { resolve = done; }));
    mount();
    const checkbox = screen.getByRole("button", { name: "Read 완료 상태 변경" });
    fireEvent.click(checkbox);
    fireEvent.click(checkbox);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith("/api/todos/7/dates/2026-11-13/complete", { completed: true });
    resolve(ok({}));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(setTodos).toHaveBeenCalled();
});

test("keeps the editor and input when the server rejects a save", async () => {
    put.mockResolvedValue({ isSuccess: false, message: "Save failed" });
    mount();
    fireEvent.click(screen.getByText("Read"));
    await screen.findByText("할 일 수정하기");
    fireEvent.click(screen.getByText("저장"));
    expect((await screen.findByRole("alert")).textContent).toBe("Save failed");
    expect(screen.getByPlaceholderText("내용을 입력해주세요").value).toBe("Read");
    expect(refresh).not.toHaveBeenCalled();
});

test("discards detail responses after selecting another date", async () => {
    let resolve;
    get.mockImplementation((url) => url === "/api/categories"
        ? Promise.resolve(ok([{ categoryName: "Study" }]))
        : new Promise((done) => { resolve = done; }));
    const { rerender } = mount();
    fireEvent.click(screen.getByText("Read"));
    rerender(<Todo selectedDate={new Date(2026, 10, 14)} todosByDate={{}}
        setTodosByDate={setTodos} onCompletedChange={refresh} />);
    resolve(ok({ todoId: 7, description: "Read", categoryName: "Study" }));
    await waitFor(() => expect(screen.getByText("+").disabled).toBe(false));
    expect(screen.queryByText("할 일 수정하기")).toBeNull();
});
