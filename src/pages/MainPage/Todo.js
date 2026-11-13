import React, { useEffect, useRef, useState } from "react";
import "../../styles/Todo.css";
import TodoModal from "./TodoModal";
import { get, patch, post, put, del } from "../../Api";
import config from "../../Config";

const weeks = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const resultOf = (response) => {
    if (response?.isSuccess === false) throw new Error(response.message || "요청에 실패했습니다.");
    return response?.result;
};

const categoryColors = ["#E5F8F1", "#FFC8BE", "#B6DAFF", "#E9E7FF", "#FFE7F1"];

const toDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const Todo = ({ selectedDate, todosByDate, setTodosByDate, onCompletedChange, loading = false }) => {
    const dateKey = toDateKey(selectedDate);

    const todos = todosByDate[dateKey] ?? [];

    const [serverCategories, setServerCategories] = useState([]);
    const [categoryError, setCategoryError] = useState("");
    const [updating, setUpdating] = useState(false);
    const busy = useRef(false);
    const detailRequest = useRef(0);
    const [actionError, setActionError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState(null);

    useEffect(() => {
        detailRequest.current += 1;
        setIsModalOpen(false);
        setActionError("");
    }, [dateKey]);

    const runAction = async (action) => {
        if (busy.current || loading) return;
        busy.current = true;
        setUpdating(true);
        setActionError("");
        try {
            await action();
        } catch (error) {
            setActionError(error.response?.data?.detail || error.response?.data?.message || error.message);
        } finally {
            busy.current = false;
            setUpdating(false);
        }
    };

    useEffect(() => {
        let active = true;
        const fetchCategories = async () => {
            try {
                const response = await get(config.CATEGORIES.GET);
                if (response?.isSuccess === false || !Array.isArray(response?.result)) {
                    throw new Error("유효하지 않은 카테고리 응답입니다.");
                }
                if (active) setServerCategories(response.result);
            } catch (error) {
                console.error("카테고리 조회 실패:", error);
                if (active) setCategoryError("카테고리를 불러오지 못했습니다.");
            }
        };
        fetchCategories();
        return () => { active = false; };
    }, []);

    const categories = Object.fromEntries(serverCategories.map((category, index) => [
        category.categoryName,
        { backgroundColor: categoryColors[index % categoryColors.length], color: "#333" },
    ]));

    const openModal = () => {
        if (busy.current || loading) return;
        setActionError("");
        setEditingTodo(null);
        setIsModalOpen(true);
    };

    const openEditModal = (todo) => runAction(async () => {
        const request = ++detailRequest.current;
        const detail = resultOf(await get(config.TODOS.DETAIL(todo.id)));
        if (!detail || detail.todoId == null) throw new Error("상세 정보를 불러오지 못했습니다.");
        if (request !== detailRequest.current) return;
        setEditingTodo({ ...todo, text: detail.description, category: detail.categoryName,
            routine: detail.routineEnabled ? {
                startDate: detail.startDate, endDate: detail.endDate,
                repeatDays: weeks.indexOf(detail.week),
            } : null,
        });
        setIsModalOpen(true);
    });

    const TodoCompleted = (id) => runAction(async () => {
        const todo = todos.find((item) => item.id === id);
        if (!todo) return;
        resultOf(await patch(config.TODOS.TOGGLE_COMPLETE(id, dateKey), {
            completed: !todo.completed,
        }));
        setTodosByDate((prev) => ({ ...prev, [dateKey]: (prev[dateKey] || []).map((item) =>
            item.id === id ? { ...item, completed: !todo.completed } : item) }));
        onCompletedChange?.();
    });

    const handledSaveTodo = ({text, category, routine}) => runAction(async () => {
        const payload = {
            description: text, categoryName: category, routineEnabled: Boolean(routine),
            startDate: routine?.startDate || null, endDate: routine?.endDate || null,
            week: routine ? weeks[routine.repeatDays] : null,
        };
        if (routine && (!payload.startDate || !payload.endDate || !payload.week || payload.startDate > payload.endDate)) {
            throw new Error("루틴의 날짜와 반복 요일을 확인해주세요.");
        }
        if (editingTodo) resultOf(await put(config.TODOS.PUT(editingTodo.id), payload));
        else resultOf(await post(config.TODOS.POST, payload, { params: { date: dateKey } }));
        setIsModalOpen(false);
        onCompletedChange?.();
    });

    const handledDeleteTodo = () => runAction(async () => {
        if (!editingTodo) return;
        resultOf(await del(config.TODOS.DELETE_BY_DATE(editingTodo.id, dateKey)));
        setIsModalOpen(false);
        onCompletedChange?.();
    });

    return (
        <div className="todo-container">
            <div className="todo-header">
                <div className="todo-title">To do List</div>
                <button className="todo-add" disabled={updating || loading} onClick={openModal}>+</button>
            </div>
            {categoryError && <p role="alert">{categoryError}</p>}
            {!isModalOpen && actionError && <p role="alert">{actionError}</p>}
            <div className="todo-list">
                {todos.map((t) => (
                    <div
                        key={t.id}
                        className={`todo-item ${t.completed ? 'done' : ''}`}
                        onClick={() => openEditModal(t)}
                    >
                        <button
                            disabled={updating || loading}
                            aria-label={`${t.text} 완료 상태 변경`}
                            aria-pressed={Boolean(t.completed)}
                            className={`checkbox ${t.completed ? 'checked' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                TodoCompleted(t.id);
                            }}
                        >
                        </button>
                        <div className="todo-text">{t.text}</div>
                        <div
                            className="todo-category"
                            style={categories[t.category]}
                        >
                            {t.category}
                        </div>
                    </div>
                ))}
            </div>
            <TodoModal
                isOpen={isModalOpen}
                onClose={() => { if (!busy.current) setIsModalOpen(false); }}
                onSave={handledSaveTodo}
                onDelete={handledDeleteTodo}
                initialTodo={editingTodo}
                categories={categories}
                busy={updating}
                error={actionError}
            />
        </div>
    );
};

export default Todo;
