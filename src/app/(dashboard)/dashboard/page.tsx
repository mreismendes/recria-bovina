import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Users, TrendingUp, Package, AlertTriangle } from "lucide-react";

async function getDashboardStats() {
  const hoje = new Date();
  const limiteAlertaPesagem = new Date(hoje.getTime() - 45 * 24 * 60 * 60 * 1000);

  const [totalAnimais, totalLotes, animaisSemPesagem, carenciasAtivas] = await Promise.all([
    prisma.animal.count({ where: { status: "ATIVO" } }),
    prisma.lote.count({ where: { ativo: true } }),
    prisma.animal.count({
      where: {
        status: "ATIVO",
        pesagens: { none: { dataPesagem: { gte: limiteAlertaPesagem } } },
      },
    }),
    prisma.carenciaMedicamento.count({
      where: { ativa: true, dataFim: { gte: hoje } },
    }),
  ]);

  const lotes = await prisma.lote.findMany({
    where: { ativo: true },
    include: {
      contrato: true,
      grupoContrato: { select: { id: true, nome: true } },
      pertinencias: {
        where: { dataFim: null },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return { totalAnimais, totalLotes, animaisSemPesagem, carenciasAtivas, lotes };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Animais Ativos", value: stats.totalAnimais, icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { label: "Lotes Ativos", value: stats.totalLotes, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Alertas de Pesagem", value: stats.animaisSemPesagem, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Carências Ativas", value: stats.carenciasAtivas, icon: Package, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel de Gestão</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral do rebanho — {formatDate(new Date())}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{card.label}</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{card.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lotes table */}
      <div className="bg-white shadow-sm rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900">Lotes Ativos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Lote", "Fazenda / Grupo", "Cabeças", "Criado em"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.lotes.map((lote) => (
                <tr key={lote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{lote.nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{lote.contrato?.nomeFazenda ?? lote.grupoContrato?.nome ?? ""}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{lote.pertinencias.length}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(lote.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
