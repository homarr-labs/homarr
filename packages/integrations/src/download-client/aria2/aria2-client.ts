
import { aria2, Conn, ReadyState, open, PreconfiguredSocket, OpenOptions } from "maria2/dist"
import { fetch } from "undici";

type Aria2Type = typeof aria2

// Extract method argument types and return types
type MethodArguments<T> = T extends (conn: Conn, ...args: infer A) => any ? A : never;
type MethodReturnType<T> = T extends (...args: any) => infer R ? R : never;

// Define a helper to ensure type safety
type Aria2ProxyHandler<T = Aria2Type> = {
    [K in keyof T]: (...args: MethodArguments<T[K]>) => MethodReturnType<T[K]>;
};

interface Aria2Config {
    baseUrl: string
    secretKey?: string
    dispatcher?: typeof fetch;

    timeout?: number;
    openTimeout?: number;
}

// Adapter layer with maria2 transport
function getSocket(config: Aria2Config): PreconfiguredSocket {
    return new (class extends EventTarget {
        readyState: ReadyState = 1

        close(): void {
            this.readyState = 3
        }

        getOptions(): Partial<OpenOptions> {
            return {
                secret: config.secretKey,
                openTimeout: config.openTimeout || 5000,
                timeout: config.timeout || 5000
            }
        }

        send(data: string): void {
            const dispatcher = config.dispatcher || fetch
            dispatcher(config.baseUrl, {
                method: "POST",
                body: data,
                headers: {
                    "Content-Type": "application/json"
                },
            }).then(async (res) => {
                this.dispatchEvent(new MessageEvent('message', { data: await res.text() }))
            });
        }
    }) as any;
}

export async function CreateAria2(this: any, config: Aria2Config) {
    const conn = await open(getSocket(config));
    return new Proxy({ conn, config: config }, {
        get: (target, prop: string) => {
            if (prop === "then") return this;
            if (prop in aria2) {
                return (...args: any[]) => {
                    const method = (aria2 as any)[prop];
                    return method(conn, ...args);
                };
            }
            throw new Error(`Method ${prop} does not exist`);
        },
    }) as any as Aria2ProxyHandler;
}

export type * from "maria2"