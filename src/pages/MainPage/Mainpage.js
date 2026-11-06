import React, { useEffect, useState } from "react";
import CustomCalendar from "./Calendar";
import Todo from "./Todo";
import { get } from "../../Api";
import config from "../../Config";
import "../../styles/MainPage.css";

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const MainPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [todoData, setTodoData] = useState({ date: "", items: [] });
  const [calendarData, setCalendarData] = useState({ month: "", days: {} });
  const [refreshKey, setRefreshKey] = useState(0);
  const [calendarError, setCalendarError] = useState("");
  const [todoError, setTodoError] = useState("");
  const dateKey = toDateKey(selectedDate);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;
  const monthKey = `${year}-${month}`;

  useEffect(() => {
    let active = true;
    const fetchCalendar = async () => {
      try {
        const response = await get(config.CALENDAR.GET, { year, month });
        if (response?.isSuccess === false) throw new Error(response.message);
        const result = response.result;
        const days = Object.fromEntries(
          result.days.filter((day) => day.hasTodo).map((day) => [day.date, day.remaining])
        );
        if (active) {
          setCalendarData({ month: monthKey, days });
          setCalendarError("");
        }
      } catch (error) {
        if (active) setCalendarError("캘린더를 불러오지 못했습니다.");
      }
    };
    fetchCalendar();
    return () => { active = false; };
  }, [year, month, monthKey, refreshKey]);

  useEffect(() => {
    let active = true;
    const fetchTodos = async () => {
      try {
        const response = await get(config.TODOS.LIST, { date: dateKey });
        if (response?.isSuccess === false) throw new Error(response.message);
        const result = response.result;
        const items = result.map((todo) => ({
          id: todo.todoId, text: todo.description, category: todo.categoryName,
          completed: todo.completed, routine: todo.routine ?? null,
        }));
        if (active) {
          setTodoData({ date: dateKey, items });
          setTodoError("");
        }
      } catch (error) {
        if (active) setTodoError("할 일을 불러오지 못했습니다.");
      }
    };
    fetchTodos();
    return () => { active = false; };
  }, [dateKey, refreshKey]);

  return (
    <div className="mainpage-container">
      {calendarError && <p role="alert">{calendarError}</p>}
      {todoError && <p role="alert">{todoError}</p>}
      <CustomCalendar
        initialDate={selectedDate}
        onDateChange={setSelectedDate}
        onMonthChange={(date) => {
          const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
          setViewDate(firstDay);
          setSelectedDate(firstDay);
        }}
        remainingByDate={calendarData.month === monthKey ? calendarData.days : {}}
      />
      <Todo
        dateKey={dateKey}
        todos={todoData.date === dateKey ? todoData.items : []}
        onTodosChange={() => setRefreshKey((key) => key + 1)}
      />
    </div>
  );
};

export default MainPage;
