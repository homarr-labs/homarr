import { Redis } from 'ioredis';
import superjson from 'superjson';

const subscriber = new Redis();
const publisher = new Redis();
const lastDataClient = new Redis();

const createChannel = <TData>(name: string) => {
    return {
        subscribe: (callback: (data: TData) => void) => {
            void lastDataClient.get(`last-${name}`).then((data) => {
                if (data) {
                    callback(superjson.parse(data))
                }
            });
            void subscriber.subscribe(name, (err) => {
                if (err) {
                    console.error(err)
                    return
                }
            });
            subscriber.on('message', (channel, message) => {
                if (channel !== name) return;

                callback(superjson.parse(message))
            });
        },
        publish: async (data: TData) => {
            await lastDataClient.set(`last-${name}`, superjson.stringify(data))
            await publisher.publish(name, superjson.stringify(data))
        }
    }
}

export const exampleChannel = createChannel<{ message: string }>('example');