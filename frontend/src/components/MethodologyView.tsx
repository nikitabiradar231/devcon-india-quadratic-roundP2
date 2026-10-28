import React from 'react';
import { BookOpen, ShieldCheck, Cpu, Code2, AlertTriangle, Layers, CheckCircle } from 'lucide-react';

export const MethodologyView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Overview Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-indigo-700">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Public Specification</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Quadratic Funding Mechanics & Verification Model
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Quadratic Funding (QF) was introduced by Vitalik Buterin, Zoë Hitzig, and E. Glen Weyl in <em>Liberal Radicalism</em>.
          It aligns funding with the public benefit of goods by subsidizing projects based on community consensus rather than raw wealth.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {/* Core Formula */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold">1. Mathematical Model & Precision Architecture</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            For each registered project <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">p</code>, the quadratic score is computed as:
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono text-sm font-bold text-indigo-900">
            Q<sub>p</sub> = ( &sum;<sub>i</sub> &radic;c<sub>i,p</sub> )<sup>2</sup>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Where <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">c_{'{i,p}'}</code> is the <strong>pre-aggregated cumulative contribution</strong> from unique contributor <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">i</code> to project <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">p</code>.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Fixed-Point Precision:</strong> To eliminate floating-point non-determinism and maintain 9 decimal places of precision, the contract scales wei amounts by <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">S = 10^9</code> (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">S^2 = 10^18</code>):
          </p>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800">
            r<sub>i,p</sub> = floor( &radic;( c<sub>i,p</sub> &times; 10<sup>18</sup> ) )
          </div>
        </div>

        {/* Anti-Split Protection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold">2. Anti-Split Transaction Protection</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Without pre-aggregation, a single contributor giving 1 ETH could split their contribution into 10 transactions of 0.1 ETH to artificially boost the square-root sum from &radic;1 = 1 to 10 &times; &radic;0.1 &approx; 3.16 (a 10x false score increase).
          </p>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <strong>Contract Guarantee:</strong> The contract records <code className="font-mono font-semibold">contributions[projectId][contributor] += msg.value</code>. When finalization runs, the square root is evaluated only once on the cumulative aggregate.
          </div>
        </div>

        {/* Merkle Eligibility & Sybil Limits */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold">3. Merkle Allowlist & Sybil-Resistance Limitations</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Eligibility is bound onchain by committing a 32-byte Merkle root. Proofs use OpenZeppelin-compatible commutative pair hashing (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">keccak256(abi.encode(msg.sender))</code>).
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Honest Trust Boundary:</strong> An allowlist validates that an address belongs to a verified attendee list. However, it does <em>not</em> prove unique human personhood against someone controlling multiple allowlisted accounts without biometric or decentralized identity checks (e.g. WorldID or Gitcoin Passport).
          </p>
        </div>

        {/* Matching Pool Conservation & Dust */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <Layers className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-bold">4. Matching Pool Conservation & Rounding Dust</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Matching payouts are calculated proportionally:
          </p>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 text-center">
            Match<sub>p</sub> = floor( ( MatchingPool &times; Q<sub>p</sub> ) / Q<sub>total</sub> )
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Because integer division truncates toward zero, the sum of all matches is guaranteed to be <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">&le; MatchingPool</code>. Any fractional remainder (&ldquo;rounding dust&rdquo;, typically 1&ndash;5 wei) remains safely in the contract and cannot cause insolvency.
          </p>
        </div>

        {/* Independent Verification */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-bold">
            <Code2 className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold">5. Independent Verification</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Anyone can independently verify the round math offline or against an active Sepolia RPC without trusting this frontend:
          </p>
          <div className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs space-y-1">
            <p className="text-slate-400"># Verify matching calculations directly from the contract</p>
            <p>npm run verify-results</p>
            <p className="text-slate-400 pt-2"># Run all contract and math tests</p>
            <p>npm test</p>
          </div>
        </div>
      </div>
    </div>
  );
};
