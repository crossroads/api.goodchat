// ---- A set of commonly used types

export type Arguments<T> = T extends (...args: infer U) => any ? U : [void]

export type Maybe<T> = T|null 

export type Listable<T> = T|T[] 

export interface Json {
  [key: string]: Listable<string|number|boolean|Date|Json>
}

export type AnyFunc = (...args: any[]) => any
