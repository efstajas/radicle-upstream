import * as commands from "../support/commands";

context("p2p", () => {
  it.only("does stuff", () => {
    cy.log("stuff happens");
    cy.task("killall");

    cy.task("node start", 17246);
    cy.task("node onboard", 17246);

    cy.task("node start", 18000);
    cy.task("node onboard", 18000);

    cy.task("node get", 17246).then(node => {
      cy.log(node.authToken);
      cy.setCookie("auth-token", node.authToken);

      cy.visit("./public/index.html?backend=localhost:17246");
    });
    commands.pick("settings").click();

    cy.wait(4000);
    cy.task("node get", 18000).then(node => {
      cy.log(node.authToken);
      cy.setCookie("auth-token", node.authToken);

      cy.visit("./public/index.html?backend=localhost:18000");
    });
    commands.pick("settings").click();

    cy.wait(4000);
    cy.task("node get", 17246).then(node => {
      cy.log(node.authToken);
      cy.setCookie("auth-token", node.authToken);

      cy.visit("./public/index.html?backend=localhost:17246");
    });
    commands.pick("settings").click();

    cy.wait(50000);
    cy.task("killall");
    cy.log("finished");
  });

  it("other stuff", () => {
    commands.resetProxyState();
    commands.onboardUser();
    cy.visit("./public/index.html");
  });
});
