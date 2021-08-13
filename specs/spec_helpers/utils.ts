import { pubsub }   from "../../lib/services/events"

export function waitForPubSub(ev: string, count: number = 1) : Promise<any[]> {
  const events : any[] = [];
  let finished = false;
  return new Promise(async (done, reject) => {
    const id = await pubsub.subscribe(ev, (payload) => {
      events.push(payload);
      if (!finished && events.length === count) {
        finished = true;
        done(events);
        pubsub.unsubscribe(id)
      }
    })

    setTimeout(() => {
      if (!finished) {
        finished = true;
        pubsub.unsubscribe(id)
        reject(new Error('waitForPubSub timeout'))
      }
    }, 1000)
  })
}

const capitalize = (s : string) => s.charAt(0).toUpperCase() + s.slice(1);

export type MatrixGetter<T = any> = {
  name: string,
  getter: () => T
}

export type MatrixItem<N extends string, T> = (
  Record<`get${Capitalize<N>}`, () => T> & { name: string }
)

export type MatrixAction<R, C> = (args : { row: R, column: C }) => any

export function testMatrix<
    R, // Type of the row argument
    C, // Type of the column argument
    RK extends string, // Key of the row argument
    CK extends string  // Key of the column argument
  >(
    params : {
      row: RK,
      column: CK,
      rows: [string, () => R][],
      columns: [string, () => C][]
    }
  ) {
  return {
    do(
      action: MatrixAction<
        MatrixItem<RK, R>,
        MatrixItem<CK, C>
      >) {
      for (const [rowName, rowGetter] of params.rows) {
        for (const [colName, colGetter] of params.columns) {
          action({
            row: <MatrixItem<RK, R>>{
              name: rowName,
              ['get' + capitalize(params.row)]: rowGetter
            },
            column: <MatrixItem<CK, C>>{
              name: colName,
              ['get' + capitalize(params.column)]: colGetter
            }
          })
        }
      }
    }
  }
}
