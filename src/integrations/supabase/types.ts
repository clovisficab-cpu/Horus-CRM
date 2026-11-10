export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      atividades: {
        Row: {
          autor: string | null
          cliente_id: string | null
          created_at: string
          descricao: string
          id: string
          lead_id: string | null
          tipo: string
        }
        Insert: {
          autor?: string | null
          cliente_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          lead_id?: string | null
          tipo?: string
        }
        Update: {
          autor?: string | null
          cliente_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          lead_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          ativo: boolean
          botao_link: string | null
          botao_texto: string | null
          created_at: string
          id: string
          imagem_url: string | null
          local: string
          ordem: number
          subtitulo: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean
          botao_link?: string | null
          botao_texto?: string | null
          created_at?: string
          id?: string
          imagem_url?: string | null
          local?: string
          ordem?: number
          subtitulo?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean
          botao_link?: string | null
          botao_texto?: string | null
          created_at?: string
          id?: string
          imagem_url?: string | null
          local?: string
          ordem?: number
          subtitulo?: string | null
          titulo?: string
        }
        Relationships: []
      }
      base_conhecimento: {
        Row: {
          categoria: string
          created_at: string
          id: string
          pergunta: string
          publicada: boolean
          resposta: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          id?: string
          pergunta: string
          publicada?: boolean
          resposta: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          pergunta?: string
          publicada?: boolean
          resposta?: string
        }
        Relationships: []
      }
      cameras: {
        Row: {
          cliente_id: string | null
          created_at: string
          id: string
          imagem_capa: string | null
          ip: string | null
          local: string | null
          marca: string | null
          nome: string
          publica: boolean
          status: string
          stream_url: string | null
          tipo_stream: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          imagem_capa?: string | null
          ip?: string | null
          local?: string | null
          marca?: string | null
          nome: string
          publica?: boolean
          status?: string
          stream_url?: string | null
          tipo_stream?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          imagem_capa?: string | null
          ip?: string | null
          local?: string | null
          marca?: string | null
          nome?: string
          publica?: boolean
          status?: string
          stream_url?: string | null
          tipo_stream?: string
        }
        Relationships: [
          {
            foreignKeyName: "cameras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      chamado_mensagens: {
        Row: {
          autor: string
          chamado_id: string
          created_at: string
          id: string
          nota_interna: boolean
          texto: string
          user_id: string | null
        }
        Insert: {
          autor?: string
          chamado_id: string
          created_at?: string
          id?: string
          nota_interna?: boolean
          texto: string
          user_id?: string | null
        }
        Update: {
          autor?: string
          chamado_id?: string
          created_at?: string
          id?: string
          nota_interna?: boolean
          texto?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamado_mensagens_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados: {
        Row: {
          aberto_por: string | null
          assunto: string
          avaliacao: number | null
          camera_id: string | null
          canal: string
          categoria: string
          cliente_id: string
          created_at: string
          descricao: string | null
          fechado_em: string | null
          id: string
          prazo_sla: string | null
          prioridade: string
          protocolo: number
          resolvido_em: string | null
          responsavel: string | null
          status: string
          updated_at: string
          whatsapp_conversa_id: string | null
        }
        Insert: {
          aberto_por?: string | null
          assunto: string
          avaliacao?: number | null
          camera_id?: string | null
          canal?: string
          categoria?: string
          cliente_id: string
          created_at?: string
          descricao?: string | null
          fechado_em?: string | null
          id?: string
          prazo_sla?: string | null
          prioridade?: string
          protocolo?: number
          resolvido_em?: string | null
          responsavel?: string | null
          status?: string
          updated_at?: string
          whatsapp_conversa_id?: string | null
        }
        Update: {
          aberto_por?: string | null
          assunto?: string
          avaliacao?: number | null
          camera_id?: string | null
          canal?: string
          categoria?: string
          cliente_id?: string
          created_at?: string
          descricao?: string | null
          fechado_em?: string | null
          id?: string
          prazo_sla?: string | null
          prioridade?: string
          protocolo?: number
          resolvido_em?: string | null
          responsavel?: string | null
          status?: string
          updated_at?: string
          whatsapp_conversa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamados_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_whatsapp_conversa_id_fkey"
            columns: ["whatsapp_conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados_ia_estado: {
        Row: {
          created_at: string
          id: boolean
          motivo: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          motivo: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: boolean
          motivo?: string
          tipo?: string
        }
        Relationships: []
      }
      chamados_resumos_ia: {
        Row: {
          chamado_id: string
          created_at: string
          resumo_ia: string
        }
        Insert: {
          chamado_id: string
          created_at?: string
          resumo_ia: string
        }
        Update: {
          chamado_id?: string
          created_at?: string
          resumo_ia?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_resumos_ia_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: true
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_usuarios: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_usuarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cidade: string | null
          created_at: string
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          status: string
          telefone: string | null
          tipo: string
          uf: string | null
          updated_at: string
          whatsapp: string | null
          data_nascimento: string | null
          consentimento_marketing: boolean
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          tipo?: string
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
          data_nascimento?: string | null
          consentimento_marketing?: boolean
        }
        Update: {
          cidade?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          tipo?: string
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
          data_nascimento?: string | null
          consentimento_marketing?: boolean
        }
        Relationships: []
      }
      contratos: {
        Row: {
          cliente_id: string
          created_at: string
          dia_vencimento: number
          id: string
          inicio: string
          plano_id: string | null
          status: string
          valor_mensal: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          dia_vencimento?: number
          id?: string
          inicio?: string
          plano_id?: string | null
          status?: string
          valor_mensal?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          dia_vencimento?: number
          id?: string
          inicio?: string
          plano_id?: string | null
          status?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          cliente_id: string
          contrato_id: string | null
          created_at: string
          id: string
          pago_em: string | null
          referencia: string
          status: string
          valor: number
          vencimento: string
        }
        Insert: {
          cliente_id: string
          contrato_id?: string | null
          created_at?: string
          id?: string
          pago_em?: string | null
          referencia: string
          status?: string
          valor?: number
          vencimento: string
        }
        Update: {
          cliente_id?: string
          contrato_id?: string | null
          created_at?: string
          id?: string
          pago_em?: string | null
          referencia?: string
          status?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "faturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_convites: {
        Row: { codigo: string; conversa_id: string | null; created_at: string; expira_em: string; id: string; lead_id: string; telefone: string | null; usado_em: string | null }
        Insert: { codigo: string; conversa_id?: string | null; created_at?: string; expira_em?: string; id?: string; lead_id: string; telefone?: string | null; usado_em?: string | null }
        Update: { codigo?: string; conversa_id?: string | null; created_at?: string; expira_em?: string; id?: string; lead_id?: string; telefone?: string | null; usado_em?: string | null }
        Relationships: []
      }
      leads: {
        Row: {
          cliente_id: string | null
          created_at: string
          email: string | null
          empresa: string | null
          etapa: string
          id: string
          interesse: string | null
          nome: string
          observacoes: string | null
          origem: string
          responsavel: string | null
          telefone: string | null
          valor_estimado: number | null
          tipo: string | null
          documento: string | null
          data_nascimento: string | null
          endereco: string | null
          cidade: string | null
          uf: string | null
          cameras: number | null
          periodo_visita: string | null
          consentimento_privacidade_em: string | null
          consentimento_marketing: boolean
          pre_cadastro_em: string | null
          whatsapp_conversa_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          etapa?: string
          id?: string
          interesse?: string | null
          nome: string
          observacoes?: string | null
          origem?: string
          responsavel?: string | null
          telefone?: string | null
          valor_estimado?: number | null
          tipo?: string | null
          documento?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          cidade?: string | null
          uf?: string | null
          cameras?: number | null
          periodo_visita?: string | null
          consentimento_privacidade_em?: string | null
          consentimento_marketing?: boolean
          pre_cadastro_em?: string | null
          whatsapp_conversa_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          etapa?: string
          id?: string
          interesse?: string | null
          nome?: string
          observacoes?: string | null
          origem?: string
          responsavel?: string | null
          telefone?: string | null
          valor_estimado?: number | null
          tipo?: string | null
          documento?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          cidade?: string | null
          uf?: string | null
          cameras?: number | null
          periodo_visita?: string | null
          consentimento_privacidade_em?: string | null
          consentimento_marketing?: boolean
          pre_cadastro_em?: string | null
          whatsapp_conversa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          agendada_em: string
          chamado_id: string | null
          cliente_id: string
          concluida_em: string | null
          created_at: string
          endereco: string
          id: string
          instrucoes: string | null
          relatorio_tecnico: string | null
          status: string
          tecnico_id: string
          tipo: string
        }
        Insert: {
          agendada_em: string
          chamado_id?: string | null
          cliente_id: string
          concluida_em?: string | null
          created_at?: string
          endereco?: string
          id?: string
          instrucoes?: string | null
          relatorio_tecnico?: string | null
          status?: string
          tecnico_id: string
          tipo?: string
        }
        Update: {
          agendada_em?: string
          chamado_id?: string | null
          cliente_id?: string
          concluida_em?: string | null
          created_at?: string
          endereco?: string
          id?: string
          instrucoes?: string | null
          relatorio_tecnico?: string | null
          status?: string
          tecnico_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          destaque: boolean
          dias_gravacao: number
          id: string
          limite_cameras: number
          mensalidade: number
          nome: string
          recursos: string[]
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          dias_gravacao?: number
          id?: string
          limite_cameras?: number
          mensalidade?: number
          nome: string
          recursos?: string[]
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          dias_gravacao?: number
          id?: string
          limite_cameras?: number
          mensalidade?: number
          nome?: string
          recursos?: string[]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_acoes: {
        Row: {
          acao: string
          antes: Json | null
          atendimento_id: string | null
          cliente_id: string | null
          conversa_id: string
          created_at: string
          depois: Json | null
          descricao: string
          id: string
        }
        Insert: {
          acao: string
          antes?: Json | null
          atendimento_id?: string | null
          cliente_id?: string | null
          conversa_id: string
          created_at?: string
          depois?: Json | null
          descricao: string
          id?: string
        }
        Update: {
          acao?: string
          antes?: Json | null
          atendimento_id?: string | null
          cliente_id?: string | null
          conversa_id?: string
          created_at?: string
          depois?: Json | null
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      whatsapp_atendimentos: {
        Row: {
          acao_pendente: Json | null
          acao_pendente_em: string | null
          assunto: string | null
          atendido_por: string
          cliente_id: string | null
          conversa_id: string
          encerrado_em: string | null
          estado: string | null
          falhas_identificacao: number
          id: string
          identificado_em: string | null
          iniciado_em: string
          resumo: string | null
          status: string
          tentativas_problema: number
          ultima_interacao_em: string
        }
        Insert: {
          acao_pendente?: Json | null
          acao_pendente_em?: string | null
          assunto?: string | null
          atendido_por?: string
          cliente_id?: string | null
          conversa_id: string
          encerrado_em?: string | null
          estado?: string | null
          falhas_identificacao?: number
          id?: string
          identificado_em?: string | null
          iniciado_em?: string
          resumo?: string | null
          status?: string
          tentativas_problema?: number
          ultima_interacao_em?: string
        }
        Update: {
          acao_pendente?: Json | null
          acao_pendente_em?: string | null
          assunto?: string | null
          atendido_por?: string
          cliente_id?: string | null
          conversa_id?: string
          encerrado_em?: string | null
          estado?: string | null
          falhas_identificacao?: number
          id?: string
          identificado_em?: string | null
          iniciado_em?: string
          resumo?: string | null
          status?: string
          tentativas_problema?: number
          ultima_interacao_em?: string
        }
        Relationships: []
      }
      whatsapp_bot_jobs: {
        Row: {
          created_at: string
          erro: string | null
          id: string
          mensagem_id: string
          resposta_id: string | null
          status: string
          iniciado_em: string | null
        }
        Insert: {
          created_at?: string
          erro?: string | null
          id?: string
          mensagem_id: string
          resposta_id?: string | null
          status?: string
          iniciado_em?: string | null
        }
        Update: {
          created_at?: string
          erro?: string | null
          id?: string
          mensagem_id?: string
          resposta_id?: string | null
          status?: string
          iniciado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bot_jobs_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_bot_jobs_resposta_id_fkey"
            columns: ["resposta_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          endereco_aprovacao_humana: boolean
          horario: Json
          id: boolean
          iris_ativa: boolean
          limite_mensagens_minuto: number
          plantao_telefone: string | null
          updated_at: string
          visita_duracao_min: number
          visita_horarios: string[]
        }
        Insert: {
          endereco_aprovacao_humana?: boolean
          horario?: Json
          id?: boolean
          iris_ativa?: boolean
          limite_mensagens_minuto?: number
          plantao_telefone?: string | null
          updated_at?: string
          visita_duracao_min?: number
          visita_horarios?: string[]
        }
        Update: {
          endereco_aprovacao_humana?: boolean
          horario?: Json
          id?: boolean
          iris_ativa?: boolean
          limite_mensagens_minuto?: number
          plantao_telefone?: string | null
          updated_at?: string
          visita_duracao_min?: number
          visita_horarios?: string[]
        }
        Relationships: []
      }
      whatsapp_conversas: {
        Row: {
          cliente_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          modo: string
          nao_lidas: number
          nome: string
          telefone: string
          ultima_mensagem: string | null
          ultima_mensagem_em: string | null
          urgente: boolean
          resumo_transferencia: string | null
          transferida_em: string | null
          opt_out_avisos: boolean
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          modo?: string
          nao_lidas?: number
          nome?: string
          telefone: string
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
          urgente?: boolean
          resumo_transferencia?: string | null
          transferida_em?: string | null
          opt_out_avisos?: boolean
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          modo?: string
          nao_lidas?: number
          nome?: string
          telefone?: string
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
          urgente?: boolean
          resumo_transferencia?: string | null
          transferida_em?: string | null
          opt_out_avisos?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_ia_estado: {
        Row: {
          created_at: string
          id: boolean
          motivo: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          motivo: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: boolean
          motivo?: string
          tipo?: string
        }
        Relationships: []
      }
      whatsapp_mensagens: {
        Row: {
          chamado_mensagem_id: string | null
          conversa_id: string
          created_at: string
          direcao: string
          erro: string | null
          id: string
          id_externo: string | null
          remetente: string
          status: string
          texto: string
          tempo_resposta_ms: number | null
          tipo: string
        }
        Insert: {
          chamado_mensagem_id?: string | null
          conversa_id: string
          created_at?: string
          direcao: string
          erro?: string | null
          id?: string
          id_externo?: string | null
          remetente: string
          status?: string
          texto: string
          tempo_resposta_ms?: number | null
          tipo?: string
        }
        Update: {
          chamado_mensagem_id?: string | null
          conversa_id?: string
          created_at?: string
          direcao?: string
          erro?: string | null
          id?: string
          id_externo?: string | null
          remetente?: string
          status?: string
          texto?: string
          tempo_resposta_ms?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mensagens_chamado_mensagem_id_fkey"
            columns: ["chamado_mensagem_id"]
            isOneToOne: true
            referencedRelation: "chamado_mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_events: {
        Row: {
          delivery_id: string
          event: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          received_at: string
        }
        Insert: {
          delivery_id: string
          event: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Update: {
          delivery_id?: string
          event?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      chamado_sla_horas: { Args: { _p: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      meus_clientes: { Args: { _user_id: string }; Returns: string[] }
      sistema_tem_admin: { Args: never; Returns: boolean }
      whatsapp_aplicar_acao: {
        Args: {
          _acao: string
          _assunto: string
          _categoria: string
          _chamado?: string
          _job: string
          _prioridade: string
          _texto: string
        }
        Returns: string
      }
      pre_cadastro_convite: { Args: { _codigo: string }; Returns: Json }
      pre_cadastro_enviar: { Args: { _codigo: string; _dados: Json }; Returns: string | null }
      whatsapp_convite_cadastro: {
        Args: { _atendimento: string | null; _codigo: string; _conversa: string; _interesse: string; _nome: string; _resumo: string }
        Returns: string
      }
      whatsapp_abrir_chamado: {
        Args: { _assunto: string; _atendimento: string | null; _categoria: string; _cliente: string; _conversa: string; _descricao: string; _prioridade: string }
        Returns: Json
      }
      whatsapp_horario_valido: { Args: { _inicio: string }; Returns: boolean }
      whatsapp_horarios_visita: { Args: { _dias?: number; _limite?: number }; Returns: string[] }
      whatsapp_registrar_resposta: {
        Args: { _aviso: string | null; _conversa: string; _jobs: string[]; _resumo: string | null; _tempo_ms: number | null; _textos: string[]; _transferir: boolean }
        Returns: string[]
      }
      whatsapp_reivindicar_lote: { Args: { _conversa: string; _espera_ms: number }; Returns: string[] }
      whatsapp_resumo_cliente: { Args: { _cliente: string }; Returns: Json }
      whatsapp_tecnico_livre: { Args: { _fim: string; _ignorar?: string; _inicio: string; _preferido?: string }; Returns: string }
      whatsapp_visita: {
        Args: { _atendimento: string | null; _cliente: string; _conversa: string; _inicio: string | null; _motivo: string; _ordem: string | null }
        Returns: Json
      }
      whatsapp_receber: {
        Args: {
          _externo: string
          _nome: string
          _telefone: string
          _texto: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "atendente" | "tecnico" | "cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "atendente", "tecnico", "cliente"],
    },
  },
} as const
