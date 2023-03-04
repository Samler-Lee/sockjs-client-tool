declare module 'sockjs-client/dist/sockjs.min.js' {
    import Client from 'sockjs-client';
    export default Client;
}

declare interface TopicMessage {
    time: string,
    content: string,
    type?: 'danger' | 'info' | 'success' | 'warning'
}

declare interface TopicMessageSet {
    [topicKey: string]: TopicMessage[]
}

declare interface WSHeadersOrigin {
    key: string,
    val: string
}

declare interface WSHeaders {
    [key: string]: string
}