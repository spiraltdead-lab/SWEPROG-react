// TypeScript type definitions for User, Project, and API responses

type User = {
    id: number;
    username: string;
    email: string;
    createdAt: string;
    updatedAt: string;
};


type Project = {
    id: number;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    ownerId: number;
};


type ApiResponse<T> = {
    data: T;
    error?: string;
    message?: string;
};

export { User, Project, ApiResponse };