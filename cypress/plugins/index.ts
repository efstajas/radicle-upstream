import axios from "axios";
import * as path from "path";
import * as childProcess from "child_process";
import * as util from "util";
import * as waitOn from "wait-on";

const exec = util.promisify(childProcess.exec);

const nodes: UpstreamNode[] = [];
const HOST = "127.0.0.1";

const getNode = (id: NodeId) => {
  return nodes.find(node => {
    return node.id === id;
  });
};

const sleep = async (ms: number) => {
  await new Promise(r => setTimeout(r, ms));
};

const cookieHeadersFromToken = (token: string) => {
  return {
    headers: {
      Cookie: [`auth-token=${token}; Path=/`],
    },
  };
};

type NodeId = number;

interface UpstreamNode {
  id: NodeId;
  httpListen: number;
  peerListen: number;
  pid?: number;
  authToken?: string;
  peerAddress?: string;
}

export default (on, config) => {
  on("task", {
    async "node kill all"() {
      try {
        console.log("  ### node kill all");
        await exec("killall radicle-proxy");
      } catch {}
      return null;
    },
    async "node start"(id: NodeId) {
      console.log(`  ### node start ${id}`);

      const node: UpstreamNode = { id: id, httpListen: id, peerListen: id };

      const pathToProxy = path.join(
        __dirname,
        "../../proxy/target/debug/radicle-proxy"
      );
      const process = childProcess.spawn(
        pathToProxy,
        [
          "--test",
          "--http-listen",
          `${HOST}:${node.httpListen}`,
          "--peer-listen",
          `${HOST}:${node.peerListen}`,
        ],
        {}
      );

      node.pid = process.pid;

      nodes.push(node);

      process.on("exit", () => {
        console.log(`    #[${id}] node terminated`);
        // nodes.filter((x) => { return x != node.id })
        return null;
      });

      process.stderr.setEncoding("utf8");
      process.stderr.on("data", data => {
        console.log(`    [${id}] STDERR: ${data.trim()}`);
      });

      process.stdout.setEncoding("utf8");
      process.stdout.on("data", data => {
        console.log(`    [${id}] STDOUT: ${data.trim()}`);
      });

      try {
        await waitOn({ resources: [`tcp:${HOST}:${id}`] });
        // once here, all resources are available
        console.log(`    [${id}] node started successfully`);
        return null;
      } catch (err) {
        console.log(
          `    ERROR: [${id}] node didn't start up in a timely fashion`
        );
        process.kill();
        return null;
      }
    },
    async "node onboard"(id: NodeId) {
      console.log(`  ### node onboard ${id}`);

      const node = getNode(id);

      try {
        const resp = await axios.post(`http://${HOST}:${id}/v1/keystore`, {
          passphrase: "radicle-upstream",
        });

        // FIXME: how can we avoid this sleep between the requests?
        await sleep(500);

        node.authToken = resp.headers["set-cookie"][0].match(
          /auth-token=(.*);/
        )[1];

        const resp1 = await axios.post(
          `http://${HOST}:${id}/v1/identities`,
          {
            handle: "secretariat",
          },
          cookieHeadersFromToken(node.authToken)
        );
        node.peerAddress = `${resp1.data.peerId}@${HOST}:${node.peerListen}`;
      } catch (err) {
        console.log("    ERROR: Onboarding failure: ${err}", err);
      }
      return null;
    },
    async "node connect"(nodeIds: NodeId[]) {
      console.log(`  ### node connect ${nodeIds}`);
      if (nodeIds.length < 2) {
        console.log("    Supply at least 2 node IDs");
        return null;
      }

      nodeIds.forEach(async nodeId => {
        const thisNode = getNode(nodeId);
        const remainingNodes = nodes.filter(node => {
          return thisNode.id !== node.id;
        });

        try {
          const resp = await axios.post(
            `http://${HOST}:${nodeId}/v1/session/settings`,
            {
              appearance: { theme: "dark", hints: { showRemoteHelper: true } },
              coco: {
                seeds: remainingNodes.map(node => node.peerAddress),
              },
            },
            cookieHeadersFromToken(thisNode.authToken)
          );
        } catch (err) {
          console.log("    ERROR: ", err);
        }

        await sleep(500);
      });
      return null;
    },
    async "node get"(id: NodeId) {
      return getNode(id);
    },
  });

  return config;
};
