import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Vector2Float  extends Schema{
    @type("uint32") id = 0;
    @type("number") x = Math.floor(Math.random() * 256) - 128;
    @type("number") z = Math.floor(Math.random() * 256) - 128;
}

export class Player extends Schema {
    @type("string") login = "";
    @type("number") x = Math.floor(Math.random() * 256) -128;
    @type("number") z = Math.floor(Math.random() * 256) -128;
    @type("uint8") d = 0;
    @type("uint16") score = 0;
    @type("uint8") skin = 0;
}

export class State extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type ([Vector2Float]) apples = new ArraySchema<Vector2Float>();

    appleLastId = 0;
    gameOverIDs = [];

    createApple(){
        const apple = new Vector2Float()
        apple.id = this.appleLastId++;
        this.apples.push(apple);
    }

    collectApple(player: Player, data: any){
        const apple =  this.apples.find((value) => value.id === data.id);
        if(apple === undefined) return;

        apple.x = Math.floor(Math.random() * 256) - 128;
        apple.z = Math.floor(Math.random() * 256) - 128;

        player.score++;
        //Поменять (сделать ограничение)
        player.d = Math.round(player.score / 3) ;  
    }

    createPlayer(sessionId: string, skin: number, login) {
        const player = new Player();
        player.skin = skin;
        player.login = login;
        this.players.set(sessionId, player);
    }

    removePlayer(sessionId: string) {
        if(this.players.has(sessionId)) {
            
            this.players.delete(sessionId);
        }

    }

    movePlayer (sessionId: string, movement: any) {
        this.players.get(sessionId).x = movement.x;
        this.players.get(sessionId).z = movement.z;
    }

    gameOver(data){
        const detailsPositions = JSON.parse(data);
        const clientID = detailsPositions.id;

        const gameOverID = this.gameOverIDs.find((value) => value === clientID);
        if (gameOverID !== undefined) return;
        this.gameOverIDs.push(clientID);
        this.delayClearGameOversIDs(clientID);

        this.removePlayer(clientID);
       for(let i = 0; i < detailsPositions.ds.length; i++){

        const apple = new Vector2Float()
        apple.id = this.appleLastId++;
        apple.x = detailsPositions.ds[i].x;
        apple.z = detailsPositions.ds[i].z;
        this.apples.push(apple);
       }
    }

    async delayClearGameOversIDs(clientID){
        await new Promise(resolve => setTimeout(resolve, 10000));

        const index = this.gameOverIDs.findIndex((value) => value === clientID);
        if(index <= -1) return;
        this.gameOverIDs.splice(index,1);
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

        this.onMessage("collect", (client, data)=>{
            const player = this.state.players.get(client.sessionId)
            this.state.collectApple(player, data);
        });

        this.onMessage("gameOver",(client, data)=>{
            this.state.gameOver(data);
        });

        for(let i = 0; i < this.startAppleCount; i++){
            this.state.createApple();
        }
    }

    onAuth(client, options, req) {
        return true;
    }

    onJoin (client: Client, data) {
        //Поменять эту фигню skin
        const skin = this.skins[this.clients.length -1];
        this.state.createPlayer(client.sessionId, skin, data.login);
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose () {
        console.log("Dispose StateHandlerRoom");
    }

}
