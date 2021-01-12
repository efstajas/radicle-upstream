import * as commands from "../support/commands";

context("p2p", () => {
  it.only("does stuff", () => {
    cy.log("stuff happens");
    cy.task("node kill all");

    cy.task("node start", 17246);
    cy.task("node onboard", 17246);

    cy.task("node start", 18000);
    cy.task("node onboard", 18000);

    cy.task("node connect", [17246, 18000]);

    cy.task("node get", 17246).then(node => {
      cy.log(node.authToken);
      cy.setCookie("auth-token", node.authToken);

      cy.visit("./public/index.html?backend=localhost:17246");
      commands.pick("settings").click();
    });

    cy.wait(5000);

    cy.task("node get", 18000).then(node => {
      cy.log(node.authToken);
      cy.setCookie("auth-token", node.authToken);

      cy.visit("./public/index.html?backend=localhost:18000");
      commands.pick("settings").click();
    });

    cy.wait(50000);
    cy.task("node kill all");
    cy.log("finished");
  });
});
