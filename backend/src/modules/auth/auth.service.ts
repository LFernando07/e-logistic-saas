/**
 * @fileoverview auth.service.ts
 * Servicio de autenticación para registro, inicio de sesión y gestión de credenciales.
 * Utiliza Bcrypt para hashing seguro de contraseñas y JWT para generación de tokens.
 * Emite correos de bienvenida transaccionales mediante Resend.
 */

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../notifications/email.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Registra un nuevo usuario en la base de datos (esquema 'store').
   *
   * @param dto Datos del registro (email, contraseña, nombre, rol opcional)
   * @returns Usuario creado sin contraseña y token JWT
   */
  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Verificar si el usuario ya existe
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un usuario registrado con el correo ${normalizedEmail}`);
    }

    // 2. Hash de contraseña seguro
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // 3. Crear usuario
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: dto.role || UserRole.CUSTOMER,
        tenantId: dto.tenantId || undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        createdAt: true,
      },
    });

    // 4. Generar token JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    const accessToken = this.jwtService.sign(payload);

    // 5. Enviar correo de bienvenida transaccional en segundo plano
    this.emailService
      .sendWelcomeEmail({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
      })
      .catch((err) => {
        this.logger.error(`Error enviando email de bienvenida a ${user.email}: ${err.message}`);
      });

    return {
      user,
      accessToken,
      message: 'Usuario registrado exitosamente.',
    };
  }

  /**
   * Inicia sesión validando credenciales contra la base de datos.
   *
   * @param dto Credenciales de acceso (email y contraseña)
   * @returns Usuario autenticado y token JWT
   */
  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas. Verifica tu correo y contraseña.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas. Verifica tu correo y contraseña.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    const accessToken = this.jwtService.sign(payload);

    const { passwordHash: _, ...userSafe } = user;

    return {
      user: userSafe,
      accessToken,
      message: 'Inicio de sesión exitoso.',
    };
  }

  /**
   * Consulta los datos del usuario autenticado.
   *
   * @param userId Identificador UUID del usuario
   * @returns Datos del usuario
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return user;
  }
}
