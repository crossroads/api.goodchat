import { PrismaClient } from "@prisma/client"
import { gracefulExit } from "./utils/process";

export type Unsaved<T> = Omit<T, "id" | "createdAt" | "updatedAt"> & {
  // make timestamps optional
  createdAt?: Date
  updatedAt?: Date
}

export type CollectionName = Exclude<keyof PrismaClient,`$${string}`>

const env = process.env.NODE_ENV || 'development'
const dev = /dev/.test(env)
const test = /test/.test(env)

const prisma = new PrismaClient({
  log: test ? [] : (
    dev ?
      ['query', 'info', 'warn', 'error'] :
      ['warn', 'error']
  )
});

//
// We export $queryRaw as a sql method to allow syntax coloring on template strings
//
export const sql = prisma.$queryRaw.bind(prisma)

gracefulExit(() => prisma.$disconnect());

export default prisma

