// @plan T10.11b — Dynamic update of project priority weights
// @covers EOCP-E10-02 EOCP-E10-03
//
// Description: This test verifies that changes to project-level priority weights are applied
//   dynamically.
// Prerequisites: Project priority weights can be modified at runtime.
// Steps:
//   1. Modify project priority weight → Change is accepted
//   2. Submit new jobs → New weight is applied
//   3. Observe scheduling behavior → Execution adapts dynamically

describe('T10.11b — Dynamic update of project priority weights', () => {
  // @plan T10.11b
  // @covers EOCP-E10-02 EOCP-E10-03
  it.todo('Step 1–3: project schema does not expose a priority weight field — requires scheduler-level configuration not available via HTTP API');
});
