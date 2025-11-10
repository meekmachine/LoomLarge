// VISOS/action/verbalizers/lipSync/lipSyncServiceSapi.js
import { interpret } from 'xstate';
import { BehaviorSubject } from 'rxjs';
import { lipSyncMachine } from './lipSyncMachine';
import { lipSyncScheduler } from './lipSyncScheduler';
import { initEmotiveExpressionService } from '../../visualizers/emotiveExpression/emotiveExpressionService';

export function createLipSyncServiceSapi({ rate=1.0 }={}) {
  // Emotive
  const emotive = initEmotiveExpressionService();

  // lipSyncMachine
  const actor= interpret(
    lipSyncMachine.withContext({
      ...lipSyncMachine.context,
      rate
    })
  ).start();

  // lipSyncScheduler
  const scheduler= interpret(lipSyncScheduler).start();

  const lipSync$= new BehaviorSubject({ state:'idle', context:{} });
  actor.onTransition(st=>{
    if(st.changed){
      lipSync$.next({ state: st.value, context: st.context });
      if(st.value==='scheduling'){
        const ctx= st.context;
        if(ctx.sapiVisemes && ctx.sapiVisemes.length>0){
          scheduler.send({
            type:'SCHEDULE_SAPI',
            list: ctx.sapiVisemes,
            rate
          });
        }
      }
    }
  });

  // handleSapiVisemes => pass to machine => also approximate emotive
  function handleSapiVisemes(visemeList, text='') {
    actor.send({ type:'SAPI_VISEMES', data: visemeList });
    if(text.trim()){
      approximateEmotive(text, visemeList);
    }
  }

  function approximateEmotive(text, visemeList) {
    let max=0;
    visemeList.forEach(item=>{
      if(item.offsetMs>max) max=item.offsetMs;
    });
    let total= max+200;
    if(total<500) total=3000;

    const words= text.trim().split(/\s+/);
    if(words.length>0){
      const totalChars= text.replace(/\s+/g,'').length||1;
      let running=0;
      words.forEach(w=>{
        running+= w.length;
        const ratio= running/ totalChars;
        const offset= Math.floor(total* ratio);

        setTimeout(()=>{
          emotive.handleWordBoundary(w);
        }, offset);
      });
    }
  }

  function stop() {
    console.log('[lipSyncServiceSapi] => stop => neutral + RESET');
    emotive.stop();
    scheduler.send('STOP');
    actor.send({ type:'VISEME_START', visemeId:0, durMs:10 });
  }
  function dispose() {
    stop();
    emotive.dispose();
    scheduler.stop();
    actor.stop();
    lipSync$.complete();
  }

  // For local => handleWordBoundary => not used here
  // For google => scheduleGoogleWords => not used here

  return {
    handleSapiVisemes,
    stop,
    dispose,
    lipSync$,
    actor,
    scheduler
  };
}