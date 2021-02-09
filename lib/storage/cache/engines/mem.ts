import _              from "lodash"
import { Maybe }      from "../../../types"
import { BaseEngine } from "./base"

export class MemEngine extends BaseEngine {
  private data : {
    [key: string]: string
  } = {}

  public async get(key: string) : Promise<Maybe<string>> {
    return this.data[key] || null;
  }

  public async set(key: string, val: string) : Promise<string> {
    this.data[key] = val;
    return val;
  }

  public async keys(pattern: string) : Promise<string[]> {
    const rexp = new RegExp(pattern);
    return _.keys(this.data).filter(k => rexp.test(k));
  }
}
