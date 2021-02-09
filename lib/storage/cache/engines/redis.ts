import _              from "lodash"
import { Maybe }      from "../../../types"
import { BaseEngine } from "./base"
import { Redis }      from "ioredis"

export class RedisEngine extends BaseEngine {
  constructor(private client : Redis) {
    super();
  }

  public get(key: string) : Promise<Maybe<string>> {
    return this.client.get('key');
  }

  public async set(key: string, val: string) : Promise<Maybe<string>> {
    return this.client.set(key, val);
  }

  public async keys(pattern : string) : Promise<string[]> {
    return this.client.keys(pattern);
  }
}
