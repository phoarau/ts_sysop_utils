export type Event = {
    id: number;
    controller: string;
    date: string;
    utilisateur: string;
    type: string;
    dirty: Record<string, unknown>;
};
