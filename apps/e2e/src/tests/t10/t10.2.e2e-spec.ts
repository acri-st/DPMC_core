import request from 'supertest';
import { API } from '../../support/auth';
import { asAdminSession } from '../../support/session';

// @plan T10.2 — Definition of priorities at task, chain, and request level
// @covers EOCP-E10-01
//
// Description: This test verifies that priorities can be defined at different levels and are
//   correctly interpreted by the scheduler.
// Prerequisites: Priority can be configured at task, chain, and request levels.
// Steps:
//   1. Define task-level priority → Configuration is accepted
//   2. Define chain-level priority → Configuration is accepted
//   3. Define request-level priority → Configuration is accepted
//   4. Execute jobs → Scheduler applies correct priority resolution

describe('T10.2 — Definition of priorities at task, chain, and request level', () => {
  let cookie: string;
  let projectId: string;
  let processorVersionId: string;
  let chainId: string;
  const createdTaskIds: string[] = [];

  beforeAll(async () => {
    ({ cookie } = await asAdminSession());

    const projectRes = await request(API).get('/project').set('Cookie', cookie).expect(200);
    projectId = (projectRes.body.data as { id: string }[])[0].id;

    const pvRes = await request(API).get('/processor-version').expect(200);
    processorVersionId = (pvRes.body.data as { id: string }[])[0].id;

    const chain = await request(API)
      .post('/production-chain')
      .set('Cookie', cookie)
      .send({ name: `T10.2-prio-${Date.now()}`, kind: 'Standard', comment: 'T10.2 priority levels' })
      .expect(201);
    chainId = chain.body.data.id;
  });

  afterAll(async () => {
    for (const id of createdTaskIds) {
      await request(API).delete(`/task/${id}`).set('Cookie', cookie);
    }
    if (chainId) {
      await request(API).delete(`/production-chain/${chainId}`).set('Cookie', cookie);
    }
  });

  // @plan T10.2
  // @covers EOCP-E10-01
  it('Step 1 – task-level priority is stored correctly on a Standalone task', async () => {
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId,
        kind: 'Standalone',
        processorVersionId,
        priority: 7,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T10.2 – task-level priority',
      })
      .expect(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.priority).toBe(7);
    expect(res.body.data.priorityClass).toBe('NRT');
  });

  // @plan T10.2
  // @covers EOCP-E10-01
  it('Step 2 – chain-level priority is stored correctly on a Chain task', async () => {
    const res = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId,
        kind: 'Chain',
        productionChainId: chainId,
        priority: 4,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T10.2 – chain-level priority',
      })
      .expect(201);
    createdTaskIds.push(res.body.data.id);
    expect(res.body.data.priority).toBe(4);
    expect(res.body.data.productionChainId).toBe(chainId);
  });

  // @plan T10.2
  // @covers EOCP-E10-01
  it('Step 3 – priority can be updated via PATCH /task/:id/priority (request-level override)', async () => {
    const createRes = await request(API)
      .post('/task')
      .set('Cookie', cookie)
      .send({
        projectId,
        kind: 'Standalone',
        processorVersionId,
        priority: 2,
        productionMode: 'Nominal',
        priorityClass: 'NRT',
        scheduledStartTime: new Date().toISOString(),
        comment: 'T10.2 – request-level priority override',
      })
      .expect(201);
    const taskId = createRes.body.data.id;
    createdTaskIds.push(taskId);

    const patchRes = await request(API)
      .patch(`/task/${taskId}/priority`)
      .set('Cookie', cookie)
      .send({ priority: 8, class: 'Super' })
      .expect(200);
    expect(patchRes.body.data.priority).toBe(8);
    expect(patchRes.body.data.priorityClass).toBe('Super');
  });

  // @plan T10.2
  // @covers EOCP-E10-01
  it('Step 4 – updated priority is persisted and readable via GET /task/:id', async () => {
    const taskId = createdTaskIds.at(-1)!;
    const res = await request(API)
      .get(`/task/${taskId}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.data.priority).toBe(8);
    expect(res.body.data.priorityClass).toBe('Super');
  });
});
