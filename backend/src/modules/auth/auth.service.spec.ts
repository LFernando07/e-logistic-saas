import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../notifications/email.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockEmailService: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock_jwt_token_xyz'),
    };

    mockEmailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and return token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'usr-1',
        email: 'carlos@ejemplo.com',
        firstName: 'Carlos',
        lastName: 'Mendoza',
        role: UserRole.CUSTOMER,
        tenantId: 'tenant-1',
        createdAt: new Date(),
      });

      const result = await service.register({
        email: 'carlos@ejemplo.com',
        password: 'password123',
        firstName: 'Carlos',
        lastName: 'Mendoza',
        tenantId: 'tenant-1',
      });

      expect(result.accessToken).toBe('mock_jwt_token_xyz');
      expect(result.user.email).toBe('carlos@ejemplo.com');
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-usr' });

      await expect(
        service.register({
          email: 'duplicate@ejemplo.com',
          password: 'password123',
          firstName: 'Carlos',
          lastName: 'Mendoza',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login and return token if credentials are valid', async () => {
      const hash = await bcrypt.hash('secret123', 8);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr-2',
        email: 'test@ejemplo.com',
        passwordHash: hash,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.CUSTOMER,
        tenantId: 'tenant-1',
      });

      const result = await service.login({
        email: 'test@ejemplo.com',
        password: 'secret123',
      });

      expect(result.accessToken).toBe('mock_jwt_token_xyz');
      expect(result.user.email).toBe('test@ejemplo.com');
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hash = await bcrypt.hash('otherpassword', 8);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr-3',
        email: 'test@ejemplo.com',
        passwordHash: hash,
      });

      await expect(
        service.login({
          email: 'test@ejemplo.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
