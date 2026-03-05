/**
 * PUT    /api/users/[id] — Atualiza usuário (ADMIN only)
 * DELETE /api/users/[id] — Desativa usuário (ADMIN only)
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Acesso não autorizado" }, { status: 403 });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return unauthorized();

    const body = await req.json();
    const { name, email, password, role, ativo } = body;

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 });
    }

    // If changing email, check uniqueness
    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json({ success: false, error: "Email já cadastrado" }, { status: 409 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (ativo !== undefined) updateData.ativo = ativo;

    // Only hash password if provided (allows updates without changing password)
    if (password && password.length > 0) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: "A senha deve ter pelo menos 6 caracteres" },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return unauthorized();

    // Prevent self-deactivation
    if (params.id === session.user.id) {
      return NextResponse.json(
        { success: false, error: "Você não pode desativar sua própria conta" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { ativo: false },
      select: { id: true, name: true, ativo: true },
    });

    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao desativar usuário" }, { status: 500 });
  }
}
