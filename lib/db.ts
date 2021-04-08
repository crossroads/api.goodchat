import { PrismaClient } from "@prisma/client"

export type Unsaved<T> = Omit<T, "id" | "createdAt" | "updatedAt">

export type CollectionName = Exclude<keyof PrismaClient,`\$${string}`>

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'test' ? [] : ['query', 'info', `warn`, `error`]
});

export default prisma

