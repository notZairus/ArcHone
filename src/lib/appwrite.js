import { Client, Account, TablesDB } from "appwrite";

const client = new Client();
client
  .setEndpoint("https://sgp.cloud.appwrite.io/v1")
  .setProject("69b866f400026e76cacf");

const account = new Account(client);
const tablesDB = new TablesDB(client);

export { account, tablesDB };
