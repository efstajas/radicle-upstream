import { spawn } from "child_process";
import axios from "axios";
import * as path from "path";
import * as waitOn from "wait-on";
const util = require("util");
const exec = util.promisify(require("child_process").exec);

let nodes: UpstreamNode[] = [];
let host = "127.0.0.1";

const getNode = (id: NodeId) => {
  return nodes.find(node => {
    return node.id === id;
  });
};

type NodeId = number;

interface UpstreamNode {
  id: NodeId;
  httpListen: string;
  peerListen: string;
  pid?: number;
  authToken?: string;
  peerAddress?: string;
}

export default (on, config) => {
  on("task", {
    async killall() {
      try {
        console.log("killall");
        await exec("killall radicle-proxy");
      } catch {}
      return null;
    },
    async "node start"(id) {
      let node: UpstreamNode = { id: id, httpListen: id, peerListen: id };

      console.log(`### node start ${id}`);
      const pathToProxy = path.join(
        __dirname,
        "../../proxy/target/release/radicle-proxy"
      );
      const process = spawn(
        pathToProxy,
        [
          "--test",
          "--http-listen",
          `${host}:${node.httpListen}`,
          "--peer-listen",
          `${host}:${node.peerListen}`,
        ],
        {}
      );

      node.pid = process.pid;

      nodes.push(node);

      process.on("exit", () => {
        console.log(`#[${id}] node terminated`);
        // nodes.filter((x) => { return x != node.id })
        return null;
      });

      process.stderr.setEncoding("utf8");
      process.stderr.on("data", data => {
        console.log(`  [${id}] STDERR: `, data);
      });
      process.stdout.setEncoding("utf8");
      process.stdout.on("data", data => {
        console.log(`  [#${id}] STDOUT: `, data);
      });

      var opts = {
        resources: [`tcp:${host}:${id}`],
      };

      try {
        await waitOn(opts);
        // once here, all resources are available
        console.log(`[#${id}] node started successfully`);
        return null;
      } catch (err) {
        console.log(`#[${id}] node didn't start up in a timely fashion`);
        process.kill();
        return null;
      }
    },
    async "node onboard"(id) {
      console.log(`### node onboard ${id}`);

      let node = getNode(id);

      try {
        const resp = await axios.post(`http://${host}:${id}/v1/keystore`, {
          passphrase: "radicle-upstream",
        });
        console.log(resp.statusText);

        await new Promise(r => setTimeout(r, 100));
        node.authToken = resp.headers["set-cookie"][0]
          .split(";")[0]
          .split("=")[1];

        const resp1 = await axios.post(
          `http://${host}:${id}/v1/identities`,
          {
            handle: "secretariat",
          },
          {
            headers: {
              Cookie: resp.headers["set-cookie"],
            },
          }
        );
        node.peerAddress = `${resp1.data.peerId}@${host}:${node.peerListen}`;
        console.log("NODE: ", node);
      } catch (err) {
        console.log(err);
      }
      return null;
    },
    async "node get"(id) {
      return getNode(id);
    },
  });

  return config;
};
