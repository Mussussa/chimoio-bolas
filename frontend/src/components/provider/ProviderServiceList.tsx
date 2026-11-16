import type { ProviderService } from "../../lib/api";

type ProviderServiceListProps = Readonly<{
  services: ProviderService[];
  saving: boolean;
  onEdit: (service: ProviderService) => void;
  onDelete: (service: ProviderService) => void;
}>;

export default function ProviderServiceList({ services, saving, onEdit, onDelete }: ProviderServiceListProps) {
  if (services.length === 0) return <p className="provider-empty">Ainda não publicou serviços. O primeiro anúncio ficará visível no catálogo após a publicação.</p>;

  return (
    <div className="provider-service-list">
      {services.map((service) => (
        <article className="provider-service-card" key={service.id}>
          {service.images?.length > 0 && <div className="provider-service-images">
            {service.images.map((image, index) => <img src={image} alt={`${service.title}, imagem ${index + 1}`} key={image} />)}
          </div>}
          <div className="provider-service-content">
            <span className="tag tag-green">{service.category}</span>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <div className="listing-foot"><b>{Number(service.price).toLocaleString("pt-MZ")} MT</b><span>{service.deliveryTime}</span></div>
            <div className="provider-service-actions">
              <button type="button" className="button button-outline" onClick={() => onEdit(service)}>Editar</button>
              <button type="button" className="button button-danger" disabled={saving} onClick={() => onDelete(service)}>Remover</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}