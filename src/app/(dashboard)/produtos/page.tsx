import { prisma } from "@/lib/prisma";
import { ProdutosManager } from "./_components/produtos-manager";

export default async function ProdutosPage() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
  });
  return <ProdutosManager initialProdutos={produtos} />;
}
