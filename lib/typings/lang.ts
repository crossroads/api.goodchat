// ---- A set of commonly used types

import { Prisma } from ".prisma/client"

export type Arguments<T> = T extends (...args: infer U) => any ? U : [void]

export type Maybe<T> = T|null

export type Listable<T> = T|T[]

export type Json = Prisma.InputJsonValue

export type JsonObject = Prisma.InputJsonObject

export type AnyFunc = (...args: any[]) => any
