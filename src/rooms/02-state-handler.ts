import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Vector2Float {
    @type("number") x = Math.floor(Math.random() * 256) - 128;
    @type("number") z = Math.floor(Math.random() * 256) - 128;
}

export class Player extends Schema {
    @type("number") x = Math.floor(Math.random() * 256) -128;
    @type("number") z = Math.floor(Math.random() * 256) -128;
    @type("uint8") d = 2;
    @type("uint8") skin = 0;
}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();

    createApple(){

    }

    createPlayer(sessionId: string, skin: number) {
        const player = new Player();
        player.skin = skin;

        this.players.set(sessionId, player);
    }

    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    movePlayer (sessionId: string, movement: any) {
        this.players.get(sessionId).x = movement.x;
        this.players.get(sessionId).z = movement.z;
    }
}

export class StateHandlerRoom extends Room<State> {
    maxClients = 4;

    startAppleCount = 100;
    
    skins: number[] = [0];

    mixArray(arr){
        var currentIndex = arr.length;
        var tempValue, randomIndex;
        while(currentIndex !== 0){
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -=1;
            tempValue = arr[currentIndex];
            arr[currentIndex] = arr[randomIndex];
            arr[randomIndex] = tempValue;
        }

    }

    onCreate (options) {

        for(var i = 1; i < options.skins; i++){
            this.skins.push(i);
        }

        this.mixArray(this.skins);
        
        this.setState(new State());

        this.onMessage("move", (client, data) => {
            this.state.movePlayer(client.sessionId, data);
        });

        for(let i = 0; i < this.startAppleCount; i++){
            this.state.createApple();
        }
    }

    onAuth(client, options, req) {
        return true;
    }

    onJoin (client: Client) {

        const skin = this.skins[this.clients.length -1];
        this.state.createPlayer(client.sessionId, skin);
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose () {
        console.log("Dispose StateHandlerRoom");
    }

}
