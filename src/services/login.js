import { API_URL, getHeaders } from "./api";
import { finalResponse } from "../pages/utils/responseHandler";

const endPoint = "login/"
const url = `${API_URL}/${endPoint}`

const verifyEndPoint = "login/verify/"
const verifyUrl = `${API_URL}/${verifyEndPoint}`

export const postToken = async (user) => {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
    })
    return await finalResponse(response, endPoint, 'Creation')
}

export const verifyLoginCode = async (payload) => {
    const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    return await finalResponse(response, verifyEndPoint, 'Creation')
}