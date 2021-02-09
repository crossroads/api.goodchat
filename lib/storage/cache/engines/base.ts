import { Maybe } from "../../../types";

export abstract class BaseEngine {
  public abstract get(key: string) : Promise<Maybe<string>>

  public abstract set(key: string, val: string) : Promise<Maybe<string>>

  public abstract keys(pattern: string) : Promise<string[]>
}
