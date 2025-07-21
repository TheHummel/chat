-- Create the chatdb database
CREATE DATABASE chatdb;

-- Switch to the chatdb database
\c chatdb;

-- Create tables based on schemas.py
CREATE TABLE threads (
    id UUID PRIMARY KEY,
    title TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    thread_id UUID REFERENCES threads(id),
    role TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
