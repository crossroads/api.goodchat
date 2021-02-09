import { Maybe }      from "../../types";
import { BaseEngine } from "./engines/base";
import { MemEngine }  from "./engines/mem";

export * from './engines/mem'
export * from './engines/redis'

type CacheableType = string|number|object

export class Cache {
  engine: BaseEngine

  constructor(private namespace : string = 'default') {
    this.engine = new MemEngine(); // default
  }

  setEngine(en: BaseEngine) {
    this.engine = en;
  }

  readString(key: string) : Promise<Maybe<string>> {
    return this.engine.get(this.prefix(key));
  }

  async read<T = any>(key: string) : Promise<Maybe<T>> {
    const str = await this.readString(key);
    if (str === null) {
      return null
    }
    return JSON.parse(str) as T
  }

  async write(key: string, val: CacheableType) : Promise<void> {
    await this.engine.set(this.prefix(key), JSON.stringify(val));
  }

  private prefix(key: string) : string {
    return `!goodchat:${this.namespace}/${key}`
  }
}

