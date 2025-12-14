import React from 'react';

const ResearchSpec: React.FC = () => {
  return (
    <div className="prose prose-invert prose-sm max-w-none p-6 bg-slate-800/50 rounded-xl border border-slate-700 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold text-blue-400 mb-6">Temporal RL Environment: Research Specification</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-3 border-b border-slate-700 pb-2">1. Environment Formalization</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-yellow-400 mb-2">State Space (S)</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li><strong>Agent Position:</strong> {'$(x, y)$'} coordinates.</li>
              <li><strong>Map Layout (Partially Observable):</strong> Grid {'$M_{t}$'} containing Walls, Empty, Traps, Goals.</li>
              <li><strong>Dynamic Elements:</strong> State of toggle-walls and active traps at time {'$t$'}.</li>
              <li><strong>Resources:</strong> Health {'$H_t$'}, Rewind Budget {'$B_t$'}.</li>
              <li><strong>Temporal Context:</strong> History buffer {'$H = \\{s_{t-k}, \\dots, s_t\\}$'}.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-green-400 mb-2">Action Space (A)</h3>
             <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li><strong>Movement:</strong> {'$\\{UP, DOWN, LEFT, RIGHT\\}$'}</li>
              <li><strong>Interaction:</strong> {'$\\{WAIT\\}$'} (or Trigger Switch)</li>
              <li><strong>Meta-Action:</strong> {'$REWIND(k)$'} - Reverts state to {'$S_{t-k}$'}.</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-slate-400 text-sm italic">
          <strong>Classification:</strong> POMDP (Partially Observable Markov Decision Process). The environment is non-stationary due to dynamic traps, and the agent may not see the entire grid at once (if fog of war is enabled), requiring memory.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-3 border-b border-slate-700 pb-2">2. Reward Design</h2>
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 font-mono text-sm">
          <p className="mb-2"><span className="text-purple-400">R(s, a, s')</span> = </p>
          <ul className="space-y-2 pl-4">
            <li><span className="text-green-500">+100</span> : Reaching Goal ({'$G$'})</li>
            <li><span className="text-blue-400">+5</span> : Discovering new sector (Exploration)</li>
            <li><span className="text-red-400">-1</span> : Per time step (Efficiency penalty)</li>
            <li><span className="text-red-500">-20</span> : Trap damage / Collision</li>
            <li><span className="text-yellow-500">-5</span> : Rewind usage (Cost of time travel)</li>
            <li><span className="text-red-600">-100</span> : Death (Health &le; 0)</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-200 mb-3 border-b border-slate-700 pb-2">3. Agent Design & Algorithm</h2>
        <p className="mb-3">
          To solve this non-stationary environment with a rewind meta-controller, we propose a <strong>Hierarchical PPO (Proximal Policy Optimization)</strong> architecture with an LSTM backbone.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-800 p-3 rounded border border-slate-600">
             <h4 className="font-bold text-white mb-1">Controller A (Navigation)</h4>
             <p className="text-xs text-slate-400">Standard policy {'$\\pi_{nav}(a|s)$'} outputting movement actions. Input: Local grid view (CNN) + scalar state.</p>
          </div>
          <div className="bg-slate-800 p-3 rounded border border-slate-600">
             <h4 className="font-bold text-white mb-1">Controller B (Temporal)</h4>
             <p className="text-xs text-slate-400">Meta-policy {'$\\pi_{time}(k|s, h)$'} deciding whether to proceed or rewind. Triggered by high negative reward (pain signals).</p>
          </div>
        </div>
      </section>

       <section>
        <h2 className="text-xl font-semibold text-slate-200 mb-3 border-b border-slate-700 pb-2">4. Evaluation Plan</h2>
        <ul className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
            <li><strong>Baseline Comparison:</strong> Compare AgentX (with Rewind) vs. Vanilla PPO (no rewind). Hypothesis: AgentX converges faster in trap-heavy maps.</li>
            <li><strong>Generalization:</strong> Train on procedural seeds 1-1000, Test on 1001-1100.</li>
            <li><strong>Ablation Study:</strong> Vary rewind cost {'$C_{rewind}$'}. If {'$C_{rewind} \\to 0$'}, agent abuses rewind. If {'$C_{rewind} \\to \\infty$'}, agent ignores it.</li>
        </ul>
      </section>
    </div>
  );
};

export default ResearchSpec;