import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoloader from '@grpc/proto-loader';
import {ProtoGrpcType} from './proto/chat';
import readline from 'readline';

const PORT: number = 3000;
const PROTO_FILE = './proto/chat.proto';

const packageDef = protoloader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType;
const client = new grpcObj.chatPackage.ChatService(
    `0.0.0.0:${PORT}`, grpc.credentials.createInsecure()
);

const deadLine = new Date();
deadLine.setSeconds(deadLine.getSeconds() + 5);
client.waitForReady(deadLine, (err) => {
    if(err){
        console.error(err);
        return;
    }
    onClientReady();
})
function onClientReady() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const username = process.argv[2];
    if(!username ) {
        console.log("No username");
        process.exit();
    }
    const metadata = new grpc.Metadata();
    metadata.set("username", username);
    const call = client.Chat(metadata);
    call.write({
        message : "register",
    });
    call.on("data", (chunk) => {
        console.log(`${chunk.username} ----> ${chunk.message}`);
    })
    rl.on("line", (line) => {
        if(line === "quit") {
            call.end();
        }
        else {
            call.write({
                message : line
            });
        }
    });
}

