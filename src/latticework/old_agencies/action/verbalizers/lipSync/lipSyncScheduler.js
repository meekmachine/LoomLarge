import { createMachine } from 'xstate';
export const lipSyncSchedulerMachine = createMachine({
  id:'lipSyncScheduler',
  initial:'idle',
  states:{ idle:{} }
});