import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoloader from '@grpc/proto-loader';
import {ProtoGrpcType} from './proto/chat';
import {ChatServiceHandlers} from './proto/chatPackage/ChatService'
import { ChatRequest } from './proto/chatPackage/ChatRequest';
import { ChatResponse } from './proto/chatPackage/ChatResponse';
const PORT: number = 3000;
const PROTO_FILE = './proto/chat.proto';

const packageDef = protoloader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType;
const chatPackage = grpcObj.chatPackage;

function main(){
    const server = getServer();

    server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(),(err, port)=>{
        if(err){
            console.log(err);
            return ;
        }
        console.log('Server Started...');
        server.start();
    });
}
const todoList: Array<object> = [];
const callObjectByUsername = new Map<string, grpc.ServerDuplexStream<ChatRequest, ChatResponse>>()
function getServer(){
    const server = new grpc.Server();
    server.addService(chatPackage.ChatService.service,{

        Chat: (call) => {
            call.on("data", (req) => {
                const username = call.metadata.get('username')[0] as string;
                const msg = req.message;
                console.log(username, req.message);
                for( let [user, usersCall] of callObjectByUsername  ) {
                    usersCall.write({
                        username : username,
                        message : msg
                    });
                }
                if(callObjectByUsername.get(username) === undefined) {
                    callObjectByUsername.set(username, call);
                }
            });
            call.on("end", () => {
                const username = call.metadata.get('username')[0] as string;
                callObjectByUsername.delete(username);
                console.log(`${username} is ending their chat session`);
                call.write({
                    username : "Server", 
                    message: `See you later ${username}`
                });

                call.end();
            });
        }
    } as ChatServiceHandlers);
    return server;
}
main();