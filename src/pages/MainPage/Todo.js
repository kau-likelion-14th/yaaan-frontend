import React, { useEffect, useState } from "react";
import TodoModal from "./TodoModal";
import { get, post, put, del, patch } from "../../Api";
import config from "../../Config";
import "../../styles/Todo.css";

const colors = ["#E5F8F1", "#FFC8BE", "#B6DAFF", "#E9E7FF", "#FFE7F1"];
const defaultCategories = Object.fromEntries(
    ["공부", "운동", "동아리"].map((name, index) => [name, { backgroundColor: colors[index], color: "#333" }])
);

const saveTodo = (todo, date, id) => {
  const { text, category, routine } = todo;
  const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const payload = {
    categoryName: category,
    description: text,
    routineEnabled: Boolean(routine),
    startDate: routine?.startDate || null,
    endDate: routine?.endDate || null,
    week: routine?.repeatDays != null ? weekdays[routine.repeatDays] : null,
  };
  const options = { params: { date } };
  return id != null
    ? put(config.TODOS.PUT(id), payload, options)
    : post(config.TODOS.POST, payload, options);
};

const Todo = ({ dateKey, todos, onTodosChange }) => {
    const [categories, setCategories] = useState(defaultCategories);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState(null);
    const [saving, setSaving] = useState(false);
    const [categoryError, setCategoryError] = useState("");

    useEffect(() => {
        let active = true;
        const fetchCategories = async () => {
            try {
                const response = await get(config.CATEGORIES.GET);
                if (response?.isSuccess === false) throw new Error(response.message);
                const result = response.result;
                const categories = Object.fromEntries(result.map((category, index) => [
                    category.categoryName, { backgroundColor: colors[index % colors.length], color: "#333" },
                ]));
                if (active && result.length) setCategories(categories);
            } catch (error) {
                if (active) setCategoryError("카테고리를 불러오지 못했습니다.");
            }
        };
        fetchCategories();
        return () => { active = false; };
    }, []);

    const openModal = (todo = null) => {
        setEditingTodo(todo);
        setIsModalOpen(true);
    };

    // 추가·수정·삭제·완료 변경의 성공/실패 처리를 공유합니다.
    const runAction = async (action, closeModal = false) => {
        if (saving) return;
        setSaving(true);
        try {
            const response = await action();
            if (response?.isSuccess === false) {
                throw new Error(response.message || "요청에 실패했습니다.");
            }
            onTodosChange();
            if (closeModal) {
                setIsModalOpen(false);
                setEditingTodo(null);
            }
        } catch (error) {
            const response = error.response;
            console.error("할 일 요청 실패:", response?.status, response?.data || error);
            alert(response?.data?.detail || response?.data?.message || response?.data?.title || error.message || "요청에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="todo-container">
            <div className="todo-header">
                <div className="todo-title">To do List</div>
                <button className="todo-add" onClick={() => openModal()}>+</button>
            </div>
            {categoryError && <p role="alert">{categoryError}</p>}
            <div className="todo-list">
                {todos.map((todo) => (
                    <div key={todo.id} className={`todo-item ${todo.completed ? 'done' : ''}`}
                        onClick={() => openModal(todo)}>
                        <button disabled={saving} className={`checkbox ${todo.completed ? 'checked' : ''}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                runAction(() => patch(config.TODOS.TOGGLE_COMPLETE(todo.id, dateKey), {
                                    completed: !todo.completed,
                                }));
                            }} />
                        <div className="todo-text">{todo.text}</div>
                        <div className="todo-category"
                            style={categories[todo.category] || { backgroundColor: "#eee", color: "#333" }}>
                            {todo.category}
                        </div>
                    </div>
                ))}
            </div>
            <TodoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={(todo) => runAction(() => saveTodo(todo, dateKey, editingTodo?.id), true)}
                onDelete={() => editingTodo && runAction(
                    () => del(config.TODOS.DELETE_BY_DATE(editingTodo.id, dateKey)), true
                )}
                initialTodo={editingTodo}
                categories={categories}
                saving={saving}
            />
        </div>
    );
};

export default Todo;
