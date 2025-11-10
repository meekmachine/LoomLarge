// VISOS/action/verbalizers/lipSync/lipSyncServiceWebSpeech.js
import { interpret } from 'xstate';
import { BehaviorSubject } from 'rxjs';
import { lipSyncMachine } from './lipSyncMachine';
import { lipSyncScheduler } from './lipSyncScheduler';
import { initEmotiveExpressionService } from '../../visualizers/emotiveExpression/emotiveExpressionService';

export function createLipSyncServiceWebSpeech({ rate=1.0 }={}) {
  // 1) Emotive
  const emotive = initEmotiveExpressionService();

  // 2) lipSyncMachine => interpret
  const actor= interpret(
    lipSyncMachine.withContext({
      ...lipSyncMachine.context,
      rate
    })
  ).start();

  // 3) lipSyncScheduler => interpret => set local shapes
  const scheduler= interpret(lipSyncScheduler).start();

  // 4) BehaviorSubject => watchers
  const lipSync$= new BehaviorSubject({ state:'idle', context:{} });
  actor.onTransition(st=>{
    if(st.changed){
      lipSync$.next({ state: st.value, context: st.context });

      // If scheduling => check mappedVisemes => schedule
      if(st.value==='scheduling'){
        const ctx= st.context;
        if(ctx.mappedVisemes && ctx.mappedVisemes.length>0){
          scheduler.send({
            type:'SCHEDULE_LOCAL',
            list: ctx.mappedVisemes,
            rate
          });
        }
      }
    }
  });

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  //   handleWordBoundary => local => emotive => no forced stop
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  function handleWordBoundary(word) {
    emotive.handleWordBoundary(word);
    actor.send({ type:'WORD_BOUNDARY', word });
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  //   scheduleGoogleWords => naive => 1.5
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  function scheduleGoogleWords(rawText, rateVal) {
    console.log('[lipSyncServiceWebSpeech] => scheduleGoogleWords =>', rawText);
    const words= rawText.split(/\s+/);
    let delay=0;
    words.forEach(w=>{
      const chunkDur= (w.length*50*1.5)/ rateVal;
      setTimeout(()=>{
        handleWordBoundary(w);
      }, delay);
      delay+= chunkDur;
    });

    setTimeout(()=>{
      // optional => stop => or do nothing
    }, delay+200);
  }

  // stop => neutral + RESET (no actor.stop)
  function stop() {
    console.log('[lipSyncServiceWebSpeech] => stop => neutral + RESET');
    neutralVisemes();                 // clear mouth
    scheduler.send('STOP');           // cancel pending timeouts
    actor.send({ type:'VISEME_START', visemeId:0, durMs:10 }); // quick neutral pulse
  }
  function dispose() {
    stop();
    emotive.dispose();
    scheduler.stop();
    actor.stop();
    lipSync$.complete();
  }

  return {
    handleWordBoundary,
    scheduleGoogleWords,
    stop,
    dispose,
    lipSync$,
    actor,
    scheduler
  };
}