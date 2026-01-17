import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';

export interface AuthUser {
  id: string;
  email: string;
  organizations: string[];
}

interface JwtPayload {
  sub: string;
  email: string;
  aud: string;
  exp: number;
  iat: number;
}

@Injectable()
export class AuthService {
  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
  ) {}

  /**
   * Verify Supabase JWT token and return user info
   */
  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const secret = this.config.get<string>('supabase.jwtSecret');

      if (!secret) {
        console.error('Missing JWT secret');
        return null;
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;

      // Get user's organizations
      const organizations = await this.supabase.getUserOrganizations(
        decoded.sub,
      );

      return {
        id: decoded.sub,
        email: decoded.email,
        organizations,
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Check if user has access to a specific tender
   */
  async checkTenderAccess(userId: string, tenderId: string): Promise<boolean> {
    try {
      // Get tender's organization
      const tender = await this.supabase.getTender(tenderId);
      if (!tender?.organization_id) {
        return false;
      }

      // Check if user is a member of that organization
      return await this.supabase.checkOrganizationMembership(
        userId,
        tender.organization_id,
      );
    } catch (error) {
      console.error('Tender access check failed:', error);
      return false;
    }
  }

  /**
   * Check if user has access to a specific position
   */
  async checkPositionAccess(
    userId: string,
    positionId: string,
  ): Promise<boolean> {
    try {
      // Get position's tender
      const { data: position, error } = await this.supabase.client
        .from('client_positions')
        .select('tender_id')
        .eq('id', positionId)
        .single();

      if (error || !position) {
        return false;
      }

      // Check tender access
      return await this.checkTenderAccess(userId, position.tender_id);
    } catch (error) {
      console.error('Position access check failed:', error);
      return false;
    }
  }
}
