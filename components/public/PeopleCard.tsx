"use client";

type PeopleCardProps = {
  photoUrl: string;
  name: string;
  role: string;
  contribution?: string;
  qualifications?: string;
  review?: string;
};

export default function PeopleCard({
  photoUrl,
  name,
  role,
  contribution,
  qualifications,
  review,
}: PeopleCardProps) {
  return (
    <div className="bg-white rounded-xl shadow hover:shadow-lg transition p-5 text-center">
      <img
        src={photoUrl}
        alt={name}
        className="w-24 h-24 mx-auto rounded-full object-cover mb-3"
      />

      <h3 className="font-semibold text-lg">{name}</h3>
      <p className="text-sm text-gray-600">{role}</p>

      {contribution && (
        <p className="text-sm mt-3 text-gray-700">{contribution}</p>
      )}

      {qualifications && (
        <p className="text-xs mt-2 text-gray-500">{qualifications}</p>
      )}

      {review && (
        <blockquote className="text-xs italic text-gray-600 mt-3">
          “{review}”
        </blockquote>
      )}
    </div>
  );
}
