import { getCsrfToken } from "./AuthUtils";

interface HttpClient {
    get: <T>(url: string) => Promise<T>;
    post: <T>(url: string, data: object) => Promise<T>;
}

class JQueryAjaxHttpClient implements HttpClient {
    async get<T>(url: string) {
        return (await $.ajax({
            url,
            cache: false,
        })) as T;
    }

    async post<T>(url: string, data: object) {
        return (await $.ajax({
            url,
            data,
            type: "POST",
            cache: false,
            headers: { "X-CSRF-Token": getCsrfToken() },
            dataType: "json",
        })) as T;
    }
}

export const httpClient = new JQueryAjaxHttpClient();
