import { API_URL, getHeaders } from "./api";

export const getMyTasks = async () => {
    const res = await fetch(`${API_URL}/my-tasks/`, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error fetching tasks");
    return res.json();
};
