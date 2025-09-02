export type CustomCakeResponse<T> = {
    status: number;
    message: string;
    item?: T | null;
};

export type DataTableResponse<T> = {
    recordsTotal: number;
    recordsFiltered: number;
    data: T[];
};

export type CakeError = {
    message: string;
    url: string;
    code: number;
    file: string;
    line: number;
};
